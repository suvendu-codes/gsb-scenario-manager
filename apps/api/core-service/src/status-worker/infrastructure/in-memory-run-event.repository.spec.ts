import { describe, expect, it } from 'vitest';
import type { RunState } from '../../runs/domain/run-state.js';
import type { RunEvent } from '../domain/run-event.js';
import { InMemoryRunEventRepository } from './in-memory-run-event.repository.js';

const time = new Date('2026-10-09T12:00:00Z');
const old: RunState = {
  id: 'old-run', scenarioId: 'scenario', correlationId: 'old-cid',
  engineRunId: 'old-engine-run', engine: 'emulator', status: 'failed',
  verdict: null, reason: 'engine_failed', results: {}, engineRef: null,
  statusMessage: null, statusEventAt: time, resultEventAt: null,
  createdAt: time, updatedAt: time, completedAt: time,
};
const current: RunState = {
  ...old, id: 'new-run', correlationId: 'new-cid', engineRunId: null,
  status: 'accepted', reason: null, statusEventAt: null, completedAt: null,
};
const event: RunEvent = {
  event_type: 'run.status', correlation_id: 'new-cid', run_id: 'new-engine-run',
  engine: 'emulator', status: 'running', emitted_at: '2026-10-09T13:00:00Z',
};
const owner = { id: 'scenario', currentRunId: 'new-run', status: 'running' as const };

describe('separate executions of a scenario', () => {
  it.each(['failed', 'cancelled', 'completed'] as const)('late old-run %s cannot change the current execution or scenario', async (status) => {
    const store = new InMemoryRunEventRepository([old, current], [owner]);
    await store.apply({ ...event, correlation_id: old.correlationId, run_id: old.engineRunId ?? '', status });
    expect(store.snapshot().find((r) => r.id === current.id)).toEqual(current);
    expect(store.scenarioSnapshot()).toEqual([owner]);
  });
  it('stores old-run results only on the old run, and ignores their replay', async () => {
    const store = new InMemoryRunEventRepository([old, current], [owner]);
    const result: RunEvent = {
      ...event, event_type: 'run.result', correlation_id: old.correlationId,
      run_id: old.engineRunId ?? '', status: 'success', results: { engine_specific: { metric: 42 } },
    };
    expect(await store.apply(result)).toBe('updated');
    expect(await store.apply(result)).toBe('ignored');
    expect(store.snapshot().find((r) => r.id === old.id)?.results).toEqual(result.results);
    expect(store.snapshot().find((r) => r.id === current.id)).toEqual(current);
    expect(store.scenarioSnapshot()).toEqual([owner]);
  });
  it.each([
    ['accepted', 'running'], ['paused', 'paused'], ['running', 'running'],
    ['failed', 'finished'], ['cancelled', 'finished'], ['completed', 'finished'],
  ] as const)('maps current run %s to existing scenario label %s', async (status, expected) => {
    const store = new InMemoryRunEventRepository([old, current], [owner]);
    await store.apply({ ...event, status });
    expect(store.scenarioSnapshot()[0]).toEqual({ ...owner, status: expected });
    expect(store.snapshot().find((r) => r.id === old.id)).toEqual(old);
  });
  it('completes the current run and scenario together while preserving old results', async () => {
    const store = new InMemoryRunEventRepository([old, current], [owner]);
    await store.apply({ ...event, event_type: 'run.result', status: 'success', results: { anything: [1, 2] } });
    expect(store.snapshot().find((r) => r.id === current.id)).toMatchObject({ status: 'completed', results: { anything: [1, 2] } });
    expect(store.scenarioSnapshot()[0].status).toBe('finished');
    expect(store.snapshot().find((r) => r.id === old.id)).toEqual(old);
  });
  it('does not infer the current run from creation timestamps', async () => {
    const store = new InMemoryRunEventRepository([current], [{ ...owner, currentRunId: null }]);
    await store.apply({ ...event, status: 'failed' });
    expect(store.scenarioSnapshot()).toEqual([{ ...owner, currentRunId: null }]);
  });
  it('rejects a wrong engine run identity without changing either record', async () => {
    const store = new InMemoryRunEventRepository([old, current], [owner]);
    await expect(store.apply({ ...event, correlation_id: old.correlationId })).rejects.toThrow('identity');
    expect(store.snapshot()).toEqual([old, current]);
    expect(store.scenarioSnapshot()).toEqual([owner]);
  });
});
