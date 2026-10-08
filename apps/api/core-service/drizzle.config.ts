import { defineConfig } from 'drizzle-kit';
import { appConfig } from './src/config';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: String(appConfig.get('database_url')),
  },
});
