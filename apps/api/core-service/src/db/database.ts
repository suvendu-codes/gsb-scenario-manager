import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { appConfig } from '../config';

class Database {
  readonly db: NodePgDatabase;

  constructor() {
    this.db = drizzle(String(appConfig.get('database_url')));
  }
}

export default new Database();
