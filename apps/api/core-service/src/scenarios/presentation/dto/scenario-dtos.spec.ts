import { describe, expect, it, vi } from 'vitest';
import { CloneScenarioDto } from './clone-scenario.dto.js';
import { CreateScenarioDto } from './create-scenario.dto.js';
import { ListAllScenariosQuery } from './list-all-scenarios.query.js';
import { validScenarioConfig } from './scenario-config.fixture.js';
import { PatchScenarioDto } from './update-scenario.dto.js';

vi.mock('../../../config.js', () => ({
  appConfig: { scenarioConfig: { bucket: 'scenario-bucket', prefix: 'scenarios/' } },
}));

const uuid = '3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a13';

const validCreate = {
  name: 'Peak load',
  project_id: uuid,
  map_id: uuid,
  map_version: 1,
  config: validScenarioConfig,
};
type ValidCreateKey = keyof typeof validCreate;
const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((i) => i.path.join('.')) ?? [];

describe('CreateScenarioDto', () => {
  const parse = (input: unknown) => CreateScenarioDto.schema.safeParse(input);

  it('accepts a valid body', () => {
    expect(parse(validCreate).success).toBe(true);
  });

  it.each(Object.keys(validCreate) as ValidCreateKey[])(
    'rejects an explicit undefined for %s',
    (field) => {
      const body = { ...validCreate, [field]: undefined };
  
      const result = parse(body);
  
      expect(result.success).toBe(false);
      expect(issuePaths(result)).toEqual([field]);
    }
  );

  it.each(Object.keys(validCreate))('rejects a missing %s', (field) => {
    const body: Record<string, unknown> = { ...validCreate };
    delete body[field];
    const result = parse(body);
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });

  it('rejects an empty or partial config', () => {
    expect(parse({ ...validCreate, config: {} }).success).toBe(false);
    expect(parse({ ...validCreate, config: { agent: validScenarioConfig.agent } }).success).toBe(false);
  });

  it.each(['name', 'project_id', 'map_id'])('rejects an empty %s', (field) => {
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

  it.each(['project_id', 'map_id'])('rejects a non-uuid %s', (field) => {
    const result = parse({ ...validCreate, [field]: 'not-a-uuid' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });

  it.each([0, -1, 1.5, '1', null])('rejects map_version %j', (value) => {
    const result = parse({ ...validCreate, map_version: value });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['map_version']);
  });

  it.each([null, 'text', 7, []])('rejects a non-object body (%j)', (body) => {
    expect(parse(body).success).toBe(false);
  });
});

describe('PatchScenarioDto', () => {
  const parse = (input: unknown) => PatchScenarioDto.schema.safeParse(input);

  it('accepts an empty body and each field alone', () => {
    expect(parse({}).success).toBe(true);
    expect(parse({ name: 'New name' }).success).toBe(true);
    expect(parse({ configUri: 'gs://scenario-bucket/scenarios/config.json' }).success).toBe(true);
  });

  it.each(['name', 'configUri'])('rejects an empty %s', (field) => {
    const result = parse({ [field]: '' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });

  it.each([
    'gs://other-bucket/scenarios/config.json',
    'gs://scenario-bucket/other/config.json',
    'gs://scenario-bucket/scenarios/../other/config.json',
    'https://storage.googleapis.com/scenario-bucket/scenarios/config.json',
    'file:///etc/passwd',
    'scenarios/config.json',
  ])('rejects out-of-scope configUri %s', (configUri) => {
    const result = parse({ configUri });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['configUri']);
  });

  it.each(['name', 'configUri'])('rejects a non-string %s', (field) => {
    const result = parse({ [field]: 123 });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual([field]);
  });

  it('rejects a blank or over-long name', () => {
    expect(parse({ name: '   ' }).success).toBe(false);
    expect(parse({ name: 'x'.repeat(101) }).success).toBe(false);
  });

  it('accepts a partial overrides patch and a null reset', () => {
    expect(parse({ config: { agent: { overrides: { outage_pct: 8 } } } }).success).toBe(true);
    const reset = parse({
      config: { wms_order: { overrides: { data_window: { start: '06:00' }, order_cutoff: null } } },
    });
    expect(reset.success).toBe(true);
  });
});

describe('CloneScenarioDto', () => {
  const parse = (input: unknown) => CloneScenarioDto.schema.safeParse(input);

  it('accepts a body with or without a name', () => {
    expect(parse({}).success).toBe(true);
    expect(parse({ name: 'Copy' }).success).toBe(true);
  });

  it.each(['', '   ', 'x'.repeat(101), 1])('rejects an invalid name (%j)', (name) => {
    const result = parse({ name });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['name']);
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

  it('defaults page to 1 and limit to 20', () => {
    const result = parse({});
    expect(result.success && [result.data.page, result.data.limit]).toEqual([1, 20]);
  });

  it('accepts the maximum page', () => {
    expect(parse({ page: '10000' }).success).toBe(true);
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
    ['zero page', { page: '0' }],
    ['page over max', { page: '10001' }],
    ['huge page', { page: '100000000' }],
    ['non-numeric page', { page: 'abc' }],
  ])('rejects %s', (_label, query) => {
    expect(parse(query).success).toBe(false);
  });

  it('accepts valid uuids and ascending/descending sort', () => {
    expect(parse({ map_id: uuid, project_id: uuid, sort: 'name' }).success).toBe(true);
    expect(parse({ sort: '-name' }).success).toBe(true);
  });
});
