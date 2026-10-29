import { describe, expect, it } from 'vitest';
import { SCENARIO_ID } from '../../../test/fixtures/trigger.js';
import {
  canonicalJson,
  hashTriggerRequest,
  IdempotencyKeySchema,
  TriggerRequestSchema,
} from './trigger-request.js';

describe('TriggerRequestSchema (LLD: engine + priority)', () => {
  it('accepts engine with priority defaulting to normal', () => {
    expect(TriggerRequestSchema.parse({ engine: 'emulator' })).toEqual({ engine: 'emulator', priority: 'normal' });
    expect(TriggerRequestSchema.parse({ engine: 'simulator', priority: 'high' })).toEqual({
      engine: 'simulator',
      priority: 'high',
    });
  });

  it.each([
    ['missing engine', {}],
    ['unknown engine', { engine: 'robot' }],
    ['unknown priority', { engine: 'emulator', priority: 'urgent' }],
    ['config in the body (read from the scenario instead)', { engine: 'emulator', config: {} }],
    ['client-chosen correlation id', { engine: 'emulator', correlation_id: 'x' }],
  ])('rejects %s', (_name, body) => {
    expect(TriggerRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe('IdempotencyKeySchema', () => {
  it('accepts a UUID and trims it', () => {
    expect(IdempotencyKeySchema.parse(' 4f1c2a7e-0b8e-4d1c-9b62-6a4b5e2c9f10 ')).toBe('4f1c2a7e-0b8e-4d1c-9b62-6a4b5e2c9f10');
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['spaces inside', 'has space'],
    ['too long', 'k'.repeat(201)],
  ])('rejects %s', (_name, value) => {
    expect(IdempotencyKeySchema.safeParse(value).success).toBe(false);
  });
});

describe('canonicalJson / hashTriggerRequest', () => {
  it('is independent of key order and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: undefined } })).toBe(
      canonicalJson({ a: { d: [1, { x: 1, y: 2 }] }, b: 1 }),
    );
  });

  it('keeps array order significant', () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });

  it('hashes equal requests equally and differing ones differently', () => {
    const a = TriggerRequestSchema.parse({ engine: 'emulator' });
    const b = TriggerRequestSchema.parse({ priority: 'normal', engine: 'emulator' });
    const c = TriggerRequestSchema.parse({ engine: 'emulator', priority: 'high' });
    expect(hashTriggerRequest(SCENARIO_ID, a)).toBe(hashTriggerRequest(SCENARIO_ID, b));
    expect(hashTriggerRequest(SCENARIO_ID, a)).not.toBe(hashTriggerRequest(SCENARIO_ID, c));
    expect(hashTriggerRequest(SCENARIO_ID, a)).not.toBe(hashTriggerRequest('other', a));
    expect(hashTriggerRequest(SCENARIO_ID, a)).toMatch(/^[0-9a-f]{64}$/);
  });
});
