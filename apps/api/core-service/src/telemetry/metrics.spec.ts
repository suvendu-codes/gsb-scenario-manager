import { describe, expect, it } from 'vitest';
import { elapsedSeconds, errorCode } from './metrics.js';

describe('errorCode', () => {
  it('uses a safe machine-readable code', () => {
    expect(errorCode(Object.assign(new Error('x'), { code: 'scenario_invalid' }))).toBe('scenario_invalid');
  });

  it('falls back to internal_error without a code', () => {
    expect(errorCode(new Error('boom'))).toBe('internal_error');
    expect(errorCode(undefined)).toBe('internal_error');
    expect(errorCode('string error')).toBe('internal_error');
  });

  it('never lets free text or ids become a label', () => {
    expect(errorCode({ code: 'Invalid Scenario 123e4567' })).toBe('internal_error');
    expect(errorCode({ code: 'ECONNREFUSED' })).toBe('internal_error');
    expect(errorCode({ code: 42 })).toBe('internal_error');
  });
});

describe('elapsedSeconds', () => {
  it('is in seconds and never negative', () => {
    expect(elapsedSeconds(performance.now() + 10_000)).toBe(0);
    const s = elapsedSeconds(performance.now() - 2_000);
    expect(s).toBeGreaterThanOrEqual(2);
    expect(s).toBeLessThan(3);
  });
});
