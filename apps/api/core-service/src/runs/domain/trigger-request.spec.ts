import { describe, expect, it } from 'vitest';
import { SCENARIO_ID, SHA_A, triggerBody } from '../../../test/fixtures/trigger.js';
import { canonicalJson, hashTriggerRequest, TriggerRequestSchema } from './trigger-request.js';

const parse = (body: unknown) => TriggerRequestSchema.safeParse(body);
const firstIssuePath = (body: unknown) => {
  const result = parse(body);
  expect(result.success).toBe(false);
  return result.success ? '' : result.error.issues[0].path.join('.');
};

describe('TriggerRequestSchema', () => {
  it('accepts the fixture and defaults priority and data', () => {
    const body: Record<string, unknown> = { ...triggerBody() };
    delete body.priority;
    delete body.data;
    const result = parse(body);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe('normal');
      expect(result.data.data).toEqual({});
    }
  });

  it('accepts every data slot and the simulator engine', () => {
    const file = { uri: 'gs://b-1/x.csv', sha256: SHA_A, sizeBytes: 1, rows: 1 };
    const result = parse(
      triggerBody({ engine: 'simulator', data: { inbound: file, outbound: file, masterdata: file, mockput: file } }),
    );
    expect(result.success).toBe(true);
  });

  it.each([
    ['unknown engine', { engine: 'robot' }, 'engine'],
    ['unknown priority', { priority: 'urgent' }, 'priority'],
    ['missing config', { config: undefined }, 'config'],
    ['array config', { config: [] }, 'config'],
    ['zero duration', { run: { executionDurationMinutes: 0 } }, 'run.executionDurationMinutes'],
    ['fractional duration', { run: { executionDurationMinutes: 1.5 } }, 'run.executionDurationMinutes'],
    ['bad stop policy', { run: { executionDurationMinutes: 5, stopPolicy: 'never' } }, 'run.stopPolicy'],
    ['unknown run field', { run: { executionDurationMinutes: 5, warmup: 1 } }, 'run'],
    ['empty issuedBy', { issuedBy: '' }, 'issuedBy'],
  ])('rejects %s', (_name, override, path) => {
    expect(firstIssuePath({ ...triggerBody(), ...override })).toBe(path);
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(firstIssuePath({ ...triggerBody(), correlation_id: 'client-chosen' })).toBe('');
  });

  describe('pins', () => {
    const withPins = (pins: unknown[]) => ({ ...triggerBody(), references: { pins } });

    it('requires at least one pin', () => {
      expect(firstIssuePath(withPins([]))).toBe('references.pins');
    });

    it('requires version or versionId', () => {
      expect(firstIssuePath(withPins([{ service: 's', artifactType: 'a', id: 'i' }]))).toBe(
        'references.pins.0.versionId',
      );
    });

    it.each(['latest', 'LATEST', ' Latest '])('rejects mutable version %j', (version) => {
      expect(firstIssuePath(withPins([{ service: 's', artifactType: 'a', id: 'i', version }]))).toBe(
        'references.pins.0.version',
      );
      expect(
        firstIssuePath(withPins([{ service: 's', artifactType: 'a', id: 'i', versionId: version }])),
      ).toBe('references.pins.0.versionId');
    });

    it('rejects duplicate pins for the same artifact', () => {
      const pin = { service: 's', artifactType: 'a', id: 'i', version: 'v1' };
      expect(firstIssuePath(withPins([pin, { ...pin, version: 'v2' }]))).toBe('references.pins.1');
    });

    it('rejects unknown pin fields', () => {
      expect(
        firstIssuePath(withPins([{ service: 's', artifactType: 'a', id: 'i', version: 'v', latest: true }])),
      ).toBe('references.pins.0');
    });
  });

  describe('data files', () => {
    const withOutbound = (outbound: unknown) => ({ ...triggerBody(), data: { outbound } });
    const good = { uri: 'gs://bucket/o.csv', sha256: SHA_A, sizeBytes: 10, rows: 2 };

    it.each([
      ['non-gs uri', { ...good, uri: 'https://x/o.csv' }, 'data.outbound.uri'],
      ['uppercase sha', { ...good, sha256: SHA_A.toUpperCase() }, 'data.outbound.sha256'],
      ['short sha', { ...good, sha256: 'abc' }, 'data.outbound.sha256'],
      ['negative size', { ...good, sizeBytes: -1 }, 'data.outbound.sizeBytes'],
      ['fractional rows', { ...good, rows: 1.2 }, 'data.outbound.rows'],
      ['missing rows', { uri: good.uri, sha256: SHA_A, sizeBytes: 1 }, 'data.outbound.rows'],
    ])('rejects %s', (_name, file, path) => {
      expect(firstIssuePath(withOutbound(file))).toBe(path);
    });

    it('rejects unknown slots', () => {
      expect(firstIssuePath({ ...triggerBody(), data: { returns: good } })).toBe('data');
    });
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
    const a = TriggerRequestSchema.parse(triggerBody());
    const b = TriggerRequestSchema.parse(JSON.parse(JSON.stringify(triggerBody())));
    const c = TriggerRequestSchema.parse(triggerBody({ priority: 'high' }));
    expect(hashTriggerRequest(SCENARIO_ID, a)).toBe(hashTriggerRequest(SCENARIO_ID, b));
    expect(hashTriggerRequest(SCENARIO_ID, a)).not.toBe(hashTriggerRequest(SCENARIO_ID, c));
    expect(hashTriggerRequest(SCENARIO_ID, a)).not.toBe(hashTriggerRequest('other', a));
    expect(hashTriggerRequest(SCENARIO_ID, a)).toMatch(/^[0-9a-f]{64}$/);
  });
});
