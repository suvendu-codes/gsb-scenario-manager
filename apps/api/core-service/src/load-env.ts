import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

// Turbo/nest usually run with cwd = apps/api/core-service; repo .env lives at monorepo root.
const envPaths = [
  resolve(process.cwd(), '../../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
  resolve(__dirname, '../../../.env'),
];

for (const path of envPaths) {
  if (existsSync(path)) {
    loadDotenv({ path });
    break;
  }
}
