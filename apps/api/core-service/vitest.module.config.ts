import { defineConfig } from 'vitest/config';

// PostgreSQL + Kafka outbox suite. Needs MODULE_TEST_DATABASE_URL and MODULE_TEST_KAFKA_BROKERS
// (see test/module/OUTBOX.md); skipped without them. CI provides both as service containers.
export default defineConfig({
  test: {
    include: ['test/module/outbox-postgres-kafka.module.spec.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
