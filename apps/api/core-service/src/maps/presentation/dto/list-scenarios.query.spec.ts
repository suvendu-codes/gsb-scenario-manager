import { describe, expect, it } from 'vitest';
import { ListScenariosQuery } from './list-scenarios.query.js';

const parse = (input: unknown) => ListScenariosQuery.schema.safeParse(input);

describe('ListScenariosQuery', () => {
  it('accepts an empty query', () => {
    expect(parse({}).success).toBe(true);
  });

  it.each(['draft', 'running', 'paused', 'finished'])('accepts status=%s', (status) => {
    expect(parse({ status }).success).toBe(true);
  });

  it.each([
    ['unknown status', { status: 'active' }],
    ['"all" (list-all only)', { status: 'all' }],
    ['empty status', { status: '' }],
    ['numeric status', { status: 1 }],
    ['unknown sort field', { sort: 'bogus' }],
    ['empty sort', { sort: '' }],
    ['non-string sort', { sort: 3 }],
  ])('rejects %s', (_label, query) => {
    expect(parse(query).success).toBe(false);
  });
});
