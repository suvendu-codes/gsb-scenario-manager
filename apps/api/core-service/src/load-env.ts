import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

// Turbo/nest usually run with cwd = apps/api/core-service; repo .env lives at monorepo root.
const here = import.meta.dirname;
const envPaths = [
  resolve(process.cwd(), '../../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(here, '../../../../.env'),
  resolve(here, '../../../.env'),
];

for (const path of envPaths) {
  if (existsSync(path)) {
    loadDotenv({ path });
    break;
  }
}
