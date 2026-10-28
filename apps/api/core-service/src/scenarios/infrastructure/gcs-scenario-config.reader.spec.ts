import { beforeEach, describe, expect, it, vi } from 'vitest';

const download = vi.fn();
const file = vi.fn(() => ({ download }));
const bucket = vi.fn(() => ({ file }));

vi.mock('@google-cloud/storage', () => ({ Storage: class { bucket = bucket; } }));
vi.mock('../../config.js', () => ({
  appConfig: { scenarioConfig: { bucket: 'scenario-bucket', prefix: 'scenarios/' } },
}));

const { GcsScenarioConfigReader } = await import('./gcs-scenario-config.reader.js');
const { ScenarioConfigUriInvalidError } = await import('../domain/errors.js');

describe('GcsScenarioConfigReader', () => {
  const reader = new GcsScenarioConfigReader();

  beforeEach(() => {
    vi.clearAllMocks();
    download.mockResolvedValue([Buffer.from('{"agent":{}}')]);
  });

  it('reads a JSON object from the allowed location', async () => {
    await expect(reader.read('gs://scenario-bucket/scenarios/a/config.json')).resolves.toEqual({ agent: {} });
    expect(bucket).toHaveBeenCalledWith('scenario-bucket');
    expect(file).toHaveBeenCalledWith('scenarios/a/config.json');
  });

  it.each([
    'gs://other-bucket/scenarios/a.json',
    'gs://scenario-bucket/other/a.json',
    'gs://scenario-bucket/scenarios/../other/a.json',
    'https://storage.googleapis.com/scenario-bucket/scenarios/a.json',
    'file:///etc/passwd',
    'scenarios/a.json',
  ])('rejects %s as invalid without touching storage or echoing the uri', async (uri) => {
    const err = await reader.read(uri).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ScenarioConfigUriInvalidError);
    expect((err as Error).message).not.toContain(uri);
    expect((err as { kind: string }).kind).toBe('invalid');
    expect(bucket).not.toHaveBeenCalled();
  });
});
