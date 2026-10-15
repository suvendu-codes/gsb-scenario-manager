import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { appConfig } from '../config';
import * as schema from './schema';
import { DRIZZLE, PG_POOL } from './db.constants';

export type DrizzleDB = NodePgDatabase<typeof schema>;

class PostgresConnection {
  private pool: Pool | null = null;
  private readonly logger = new Logger('PostgresConnection');

  getPool(): Pool {
    if (!this.pool) {
      const { host, port, name, user, password } = appConfig.db;
      this.pool = new Pool({
        host,
        port,
        database: name,
        user,
        password,
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 2_000,
      });

      this.pool.on('error', (err) => {
        this.logger.error('Unexpected error on idle PG client', err.stack);
      });

      this.logger.log('PG Pool Created');
    }
    return this.pool;
  }

  async testConnection(): Promise<void> {
    try {
      const pool = this.getPool();
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      this.logger.log(`PG connected successfully at ${result.rows[0].now}`);
    } catch (error) {
      this.logger.error('Failed to connect to PG', error);
      throw error;
    }
  }

  async query(text: string, params?: unknown[]) {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Query error:', { text, error: message });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.log('PG pool closed!');
    }
  }
}

const postgresConnection = new PostgresConnection();

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (): Pool => postgresConnection.getPool(),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): DrizzleDB => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DbModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await postgresConnection.close();
  }
}
