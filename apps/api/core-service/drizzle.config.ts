import './src/load-env.js';
import { defineConfig } from 'drizzle-kit';
import { appConfig } from './src/config.js';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: appConfig.db.url,
  },
});
