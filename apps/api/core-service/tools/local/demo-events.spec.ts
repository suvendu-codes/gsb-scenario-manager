import { describe, expect, it } from 'vitest';
import { runEventSchema } from '../../src/status-worker/domain/run-event.js';
import { demoResult, demoStatus } from './demo-events.js';
import { assertLocalDemo } from './local-resources.js';

describe('local event generator', () => {
  it.each(['accepted', 'setup_ready', 'running', 'paused', 'failed'] as const)('generates valid %s events with execution identity', (status) => {
    const event = demoStatus('cid', 'engine-id', status, '2026-10-24T12:00:00Z');
    expect(runEventSchema.parse(event)).toMatchObject({ correlation_id: 'cid', run_id: 'engine-id', status });
    if (status === 'failed') expect(event).toHaveProperty('reason', 'local_demo_failure');
  });
  it('generates opaque JSON results using the agreed identity envelope', () => {
    expect(runEventSchema.parse(demoResult('cid', 'engine-id', '2026-10-24T12:00:00Z', 'test')))
      .toMatchObject({ event_type: 'run.result', results: { demo_marker: 'test' } });
  });
  it('requires explicit local opt-in and refuses production', () => {
    expect(() => assertLocalDemo({})).toThrow();
    expect(() => assertLocalDemo({ NODE_ENV: 'production', LOCAL_DEMO_ENABLED: 'true' })).toThrow();
    expect(() => assertLocalDemo({ NODE_ENV: 'development', LOCAL_DEMO_ENABLED: 'true' })).not.toThrow();
  });
});
