import { describe, expect, it } from 'vitest';
import { parseScenarioConfigUri } from './scenario-config-uri.js';

const allowed = { bucket: 'scenario-bucket', prefix: 'scenarios/' };

describe('parseScenarioConfigUri', () => {
  it('accepts an object under the allowed bucket and prefix', () => {
    expect(parseScenarioConfigUri('gs://scenario-bucket/scenarios/a/config.json', allowed)).toEqual({
      bucket: 'scenario-bucket',
      object: 'scenarios/a/config.json',
    });
  });

  it('accepts any object in the bucket when no prefix is set', () => {
    expect(parseScenarioConfigUri('gs://scenario-bucket/x.json', { bucket: 'scenario-bucket' })).not.toBeNull();
  });

  it('treats a prefix without a trailing slash as a directory', () => {
    const loose = { bucket: 'scenario-bucket', prefix: 'scenarios' };
    expect(parseScenarioConfigUri('gs://scenario-bucket/scenarios/a.json', loose)).not.toBeNull();
    expect(parseScenarioConfigUri('gs://scenario-bucket/scenarios-other/a.json', loose)).toBeNull();
  });

  it.each([
    ['wrong bucket', 'gs://other-bucket/scenarios/a.json'],
    ['bucket prefix-match only', 'gs://scenario-bucket-evil/scenarios/a.json'],
    ['wrong prefix', 'gs://scenario-bucket/other/a.json'],
    ['prefix without slash boundary', 'gs://scenario-bucket/scenarios-evil/a.json'],
    ['dot-dot traversal', 'gs://scenario-bucket/scenarios/../other/a.json'],
    ['dot segment', 'gs://scenario-bucket/scenarios/./a.json'],
    ['empty segment', 'gs://scenario-bucket/scenarios//a.json'],
    ['bucket only', 'gs://scenario-bucket'],
    ['bucket with trailing slash', 'gs://scenario-bucket/'],
    ['query string', 'gs://scenario-bucket/scenarios/a.json?x=1'],
    ['fragment', 'gs://scenario-bucket/scenarios/a.json#x'],
    ['encoded slash', 'gs://scenario-bucket/scenarios%2F..%2Fa.json'],
    ['backslash', 'gs://scenario-bucket/scenarios\\..\\a.json'],
    ['https', 'https://storage.googleapis.com/scenario-bucket/scenarios/a.json'],
    ['file', 'file:///etc/passwd'],
    ['bare path', 'scenarios/a.json'],
  ])('rejects %s', (_name, uri) => {
    expect(parseScenarioConfigUri(uri, allowed)).toBeNull();
  });

  it('rejects everything when no bucket is configured', () => {
    expect(parseScenarioConfigUri('gs://scenario-bucket/scenarios/a.json', {})).toBeNull();
  });
});
