import { describe, expect, it } from 'vitest';
import { isUniqueViolation, pgError } from './pg-errors.js';

const pg = { code: '23505', constraint: 'run_one_active_per_scenario' };

describe('pgError', () => {
  it('reads a raw pg error', () => {
    expect(pgError(pg)).toEqual(pg);
  });

  it('unwraps DrizzleQueryError causes', () => {
    const wrapped = Object.assign(new Error('Failed query'), { cause: pg });
    expect(pgError(wrapped)).toEqual(pg);
  });

  it('returns empty info for non-pg errors', () => {
    expect(pgError(new Error('x'))).toEqual({});
    expect(pgError(null)).toEqual({});
  });
});

describe('isUniqueViolation', () => {
  it('matches code and optional constraint', () => {
    expect(isUniqueViolation(pg)).toBe(true);
    expect(isUniqueViolation(pg, 'run_one_active_per_scenario')).toBe(true);
    expect(isUniqueViolation(pg, 'other')).toBe(false);
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
  });
});
