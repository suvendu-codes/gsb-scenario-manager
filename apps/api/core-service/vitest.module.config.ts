import { defineConfig } from 'vitest/config';

// Outbox module tests: the in-process suite always runs; the PostgreSQL + Kafka suite runs when
// MODULE_TEST_DATABASE_URL and MODULE_TEST_KAFKA_BROKERS are set (see test/module/OUTBOX.md).
export default defineConfig({
  test: {
    include: ['test/module/**/*.module.spec.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Suites share one database server and Kafka cluster.
    fileParallelism: false,
  },
});
