import { describe, expect, it } from 'vitest';
import { backoffDelayMs, decideOnFailure, describeError } from './retry-policy.js';

describe('backoffDelayMs', () => {
  it('doubles the ceiling per attempt and caps it', () => {
    const max = () => 1; // upper bound of the jitter window
    expect(backoffDelayMs(1, 1000, 60_000, max)).toBe(1000);
    expect(backoffDelayMs(2, 1000, 60_000, max)).toBe(2000);
    expect(backoffDelayMs(3, 1000, 60_000, max)).toBe(4000);
    expect(backoffDelayMs(10, 1000, 60_000, max)).toBe(60_000);
    expect(backoffDelayMs(10_000, 1000, 60_000, max)).toBe(60_000);
  });

  it('keeps jitter within [ceiling/2, ceiling]', () => {
    expect(backoffDelayMs(3, 1000, 60_000, () => 0)).toBe(2000);
    for (let i = 0; i < 50; i++) {
      const d = backoffDelayMs(3, 1000, 60_000);
      expect(d).toBeGreaterThanOrEqual(2000);
      expect(d).toBeLessThanOrEqual(4000);
    }
  });

  it('treats attempt 0 like attempt 1', () => {
    expect(backoffDelayMs(0, 500, 10_000, () => 1)).toBe(500);
  });
});

describe('decideOnFailure', () => {
  const base = { baseMs: 100, maxMs: 1000, random: () => 1 };

  it('parks non-retriable failures immediately', () => {
    expect(decideOnFailure({ ...base, retriable: false, attempts: 1, maxAttempts: 0 })).toEqual({ action: 'dead' });
  });

  it('retries retriable failures forever when maxAttempts is 0', () => {
    expect(decideOnFailure({ ...base, retriable: true, attempts: 500, maxAttempts: 0 })).toEqual({
      action: 'retry',
      delayMs: 1000,
    });
  });

  it('parks once maxAttempts is reached', () => {
    expect(decideOnFailure({ ...base, retriable: true, attempts: 2, maxAttempts: 3 })).toEqual({
      action: 'retry',
      delayMs: 200,
    });
    expect(decideOnFailure({ ...base, retriable: true, attempts: 3, maxAttempts: 3 })).toEqual({ action: 'dead' });
  });
});

describe('describeError', () => {
  it('formats errors on one line', () => {
    expect(describeError(new TypeError('bad\n  thing'))).toBe('TypeError: bad thing');
    expect(describeError('plain')).toBe('Error: plain');
  });

  it('truncates long messages', () => {
    const text = describeError(new Error('x'.repeat(2000)), 50);
    expect(text).toHaveLength(50);
    expect(text.endsWith('…')).toBe(true);
  });
});
