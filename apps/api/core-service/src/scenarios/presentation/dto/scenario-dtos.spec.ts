import { describe, expect, it } from 'vitest';
import { CloneScenarioDto } from './clone-scenario.dto.js';
import { CreateScenarioDto } from './create-scenario.dto.js';
import { ListAllScenariosQuery } from './list-all-scenarios.query.js';
import { UpdateScenarioDto } from './update-scenario.dto.js';

const uuid = '3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13';

const validCreate = {
  projectId: 'p1',
  mapId: 'm1',
  name: 'Peak load',
  authorId: 'u1',
  configUri: 'gs://bucket/config.json',
  createdBy: 'u1',
};

const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((i) => i.path.join('.')) ?? [];

describe('CreateScenarioDto', () => {
  const parse = (input: unknown) => CreateScenarioDto.schema.safeParse(input);

  it('accepts a valid body', () => {
    expect(parse(validCreate).success).toBe(true);
  });

  it.each(Object.keys(validCreate))('rejects a missing %s', (field) => {
    const { [field]: _omitted, ...body } = validCreate as Record<string, string>;
    const result = parse(body);
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });

  it.each(Object.keys(validCreate))('rejects an empty %s', (field) => {
    const result = parse({ ...validCreate, [field]: '' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });

  it.each([
    ['number', 42],
    ['null', null],
    ['boolean', true],
    ['object', {}],
    ['array', ['a']],
  ])('rejects a %s name', (_label, value) => {
    const result = parse({ ...validCreate, name: value });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['name']);
  });

  it.each([null, 'text', 7, []])('rejects a non-object body (%j)', (body) => {
    expect(parse(body).success).toBe(false);
  });
});

describe('UpdateScenarioDto', () => {
  const parse = (input: unknown) => UpdateScenarioDto.schema.safeParse(input);

  it('accepts updatedBy alone', () => {
    expect(parse({ updatedBy: 'u1' }).success).toBe(true);
  });

  it('rejects a missing updatedBy', () => {
    const result = parse({ name: 'New name' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['updatedBy']);
  });

  it.each(['name', 'configUri', 'updatedBy'])('rejects an empty %s', (field) => {
    const result = parse({ updatedBy: 'u1', [field]: '' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });

  it.each(['name', 'configUri', 'updatedBy'])('rejects a non-string %s', (field) => {
    const result = parse({ updatedBy: 'u1', [field]: 123 });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });
});

describe('CloneScenarioDto', () => {
  const parse = (input: unknown) => CloneScenarioDto.schema.safeParse(input);

  it('accepts an id with or without a name', () => {
    expect(parse({ id: 's1' }).success).toBe(true);
    expect(parse({ id: 's1', name: 'Copy' }).success).toBe(true);
  });

  it('rejects a missing id', () => {
    const result = parse({ name: 'Copy' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['id']);
  });

  it.each(['id', 'name'])('rejects an empty %s', (field) => {
    const result = parse({ id: 's1', [field]: '' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });

  it('rejects a non-string id', () => {
    expect(parse({ id: 1 }).success).toBe(false);
  });
});

describe('ListAllScenariosQuery', () => {
  const parse = (input: unknown) => ListAllScenariosQuery.schema.safeParse(input);

  it('accepts an empty query', () => {
    expect(parse({}).success).toBe(true);
  });

  it('coerces limit from a query string', () => {
    const result = parse({ limit: '50' });
    expect(result.success && result.data.limit).toBe(50);
  });

  it.each(['all', 'draft', 'running', 'paused', 'finished'])('accepts status=%s', (status) => {
    expect(parse({ status }).success).toBe(true);
  });

  it.each([
    ['unknown status', { status: 'active' }],
    ['empty status', { status: '' }],
    ['numeric status', { status: 1 }],
    ['non-uuid map_id', { map_id: 'm1' }],
    ['empty map_id', { map_id: '' }],
    ['non-uuid project_id', { project_id: 'p1' }],
    ['unknown sort field', { sort: 'bogus' }],
    ['empty sort', { sort: '' }],
    ['non-numeric limit', { limit: 'abc' }],
    ['zero limit', { limit: '0' }],
    ['limit over max', { limit: '101' }],
    ['fractional limit', { limit: '1.5' }],
    ['non-string cursor', { cursor: 5 }],
  ])('rejects %s', (_label, query) => {
    expect(parse(query).success).toBe(false);
  });

  it('accepts valid uuids and ascending/descending sort', () => {
    expect(parse({ map_id: uuid, project_id: uuid, sort: 'name' }).success).toBe(true);
    expect(parse({ sort: '-name' }).success).toBe(true);
  });
});
