import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { appConfig } from '../config';
import { Logger } from '@nestjs/common';

class Database {
  readonly db: NodePgDatabase;

  constructor() {
    this.db = drizzle(String(appConfig.get('database_url')));
    Logger.log('database connection ready');
  }
}

export default new Database();
