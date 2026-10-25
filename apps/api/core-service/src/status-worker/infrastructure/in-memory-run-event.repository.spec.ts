import { describe, expect, it } from 'vitest';
import { seed, status, result } from '../../../test/fixtures/run-state.js';
import { InMemoryRunEventRepository } from './in-memory-run-event.repository.js';
const owner = { id: seed.scenarioId, currentRunId: seed.id, status: 'running' as const };
const create = () => new InMemoryRunEventRepository([seed], [owner]);
describe('durable sequence planning and ownership', () => {
  it('holds gaps, continues other runs, then drains a repaired sequence in order', async () => {
    const other = { ...seed, id: 'other', scenarioId: 'other-s', correlationId: 'other-c' };
    const store = new InMemoryRunEventRepository([seed, other], [owner, { ...owner, id: other.scenarioId, currentRunId: other.id }]);
    expect(await store.apply(status({ sequence: 2, status: 'paused' }))).toBe('held');
    expect(store.snapshot()[0]).toMatchObject({ lastEventSequence: 0, recoveryRequired: true, status: 'accepted' });
    expect(await store.apply(status({ correlation_id: other.correlationId }))).toBe('updated');
    expect(await store.apply(status())).toBe('updated');
    expect(store.snapshot()[0]).toMatchObject({ lastEventSequence: 2, status: 'paused', recoveryRequired: false });
  });
  it('recognises exact duplicates and rejects changed payloads at the same sequence', async () => {
    const store = create(); const e = status();
    await store.apply(e); const before = store.snapshot();
    expect(await store.apply(e)).toBe('ignored'); expect(store.snapshot()).toEqual(before);
    await expect(store.apply({ ...e, status: 'paused' })).rejects.toThrow();
  });
  it('historical run results never update current scenario', async () => {
    const old = { ...seed, id: 'old', correlationId: 'old-cid', status: 'failed' as const };
    const store = new InMemoryRunEventRepository([seed, old], [owner]);
    await store.apply({ ...result(1), correlation_id: old.correlationId });
    expect(store.scenarioSnapshot()).toEqual([owner]); expect(store.snapshot()[0]).toEqual(seed);
  });
  it('updates current scenario only after terminal status, not a held result', async () => {
    const store = create(); await store.apply(result(2));
    expect(store.scenarioSnapshot()).toEqual([owner]);
    await store.apply(status({ status: 'completed' }));
    expect(store.scenarioSnapshot()[0].status).toBe('finished');
    expect(store.snapshot()[0].results).toEqual(result().results);
  });
  it('rejects unknown correlations and mismatched engines without mutation', async () => {
    const store = create();
    await expect(store.apply(status({ correlation_id: 'unknown' }))).rejects.toThrow();
    await expect(store.apply(status({ engine: 'simulator' }))).rejects.toThrow();
    expect(store.snapshot()).toEqual([seed]);
  });
});
