import { defineConfig, configDefaults } from 'vitest/config';

// Unit tests plus the in-process outbox module suite (no infrastructure needed). The PostgreSQL +
// Kafka suite needs real services and runs via vitest.module.config.ts (CI job "outbox module tests").
export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, 'test/module/outbox-postgres-kafka.module.spec.ts'],
  },
});
