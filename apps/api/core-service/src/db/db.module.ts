import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { appConfig } from '../config.js';
import * as schema from './schema/index.js';
import { DRIZZLE, PG_POOL } from './db.constants.js';
import { dbPoolConnections, dbPoolErrors, dbPoolPending, meter } from '../telemetry/metrics.js';

export type DrizzleDB = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const pool = new Pool({
          connectionString: appConfig.db.url,
          max: appConfig.db.poolMax,
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis: 30_000,
          maxLifetimeSeconds: 1800,
        });
        // Without a listener, an error on an idle client (e.g. DB restart or
        // dropped connection) is emitted as an unhandled 'error' event and
        // crashes the process. The pool discards the client and reconnects.
        pool.on('error', (err) => {
          dbPoolErrors.add(1);
          new Logger('DbPool').error(
            { event: 'db_pool_idle_client_error', message: err.message },
            err.stack,
          );
        });
        meter.addBatchObservableCallback(
          (result) => {
            if (pool.ended) return;
            result.observe(dbPoolConnections, pool.idleCount, { state: 'idle' });
            result.observe(dbPoolConnections, pool.totalCount - pool.idleCount, { state: 'used' });
            result.observe(dbPoolPending, pool.waitingCount);
          },
          [dbPoolConnections, dbPoolPending],
        );
        return pool;
      },
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
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
