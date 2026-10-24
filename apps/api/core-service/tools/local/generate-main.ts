import { runDemoScenario } from './demo-scenario.js';

runDemoScenario().catch((error: unknown) => {
  console.error('Local demo failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
