import { defineConfig, configDefaults } from 'vitest/config';

// Unit tests. Outbox module suites (*.module.spec.ts) run via vitest.module.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, 'test/module/**/*.module.spec.ts'],
  },
});
