import { describe, expect, it, vi } from 'vitest';
import { nextStoredConfig } from './drizzle-scenario.repository.js';

vi.mock('../../db/drizzle.module.js', () => ({ DRIZZLE: Symbol('DRIZZLE') }));

const stored = { configUri: 'gs://b/old.json', body: { agent: { overrides: { outage_pct: 5 } } }, version: 3 };

describe('nextStoredConfig', () => {
  it('keeps the body and bumps the version when patching without repointing', () => {
    const patchConfig = vi.fn(() => ({ patched: true }));
    const next = nextStoredConfig(stored, { patchConfig, updatedBy: 'u' });
    expect(patchConfig).toHaveBeenCalledWith(stored.body);
    expect(next).toMatchObject({ configUri: 'gs://b/old.json', body: { patched: true }, version: 4, updatedBy: 'u' });
  });

  it('treats the same configUri as not repointed', () => {
    const next = nextStoredConfig(stored, { configUri: 'gs://b/old.json', updatedBy: 'u' });
    expect(next.body).toEqual(stored.body);
    expect(next.version).toBe(3);
  });

  it('drops the body and version when only configUri changes', () => {
    const next = nextStoredConfig(stored, { configUri: 'gs://b/new.json', updatedBy: 'u' });
    expect(next.configUri).toBe('gs://b/new.json');
    expect(next.body).toBeUndefined();
    expect(next.version).toBeUndefined();
  });

  it('patches from nothing and restarts the version when repointing with a config patch', () => {
    const patchConfig = vi.fn(() => ({ fromNewBlob: true }));
    const next = nextStoredConfig(stored, { configUri: 'gs://b/new.json', patchConfig, updatedBy: 'u' });
    expect(patchConfig).toHaveBeenCalledWith(undefined);
    expect(next).toMatchObject({ configUri: 'gs://b/new.json', body: { fromNewBlob: true }, version: 2 });
  });
});
