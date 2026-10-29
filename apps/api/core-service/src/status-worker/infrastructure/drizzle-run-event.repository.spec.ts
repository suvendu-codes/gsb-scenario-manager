import { seed as contractSeed } from '../../../test/fixtures/run-state.js';
import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/db.module.js';
import { run } from '../../db/schema/run.js';
import { scenario } from '../../db/schema/scenario.js';
import type { RunEvent } from '../domain/run-event.js';
import { DrizzleRunEventRepository } from './drizzle-run-event.repository.js';

const event: RunEvent = {
  event_type: 'run.status', correlation_id: 'cid', run_id: 'emu',
  engine: 'emulator', sequence: 1, status: 'running', emitted_at: '2026-10-09T12:53:00Z',
};
const row: typeof run.$inferSelect = {
  ...contractSeed, retryOfRunId: null, id: 'run-id', correlationId: 'cid', engineRunId: null, scenarioId: 'scenario-id',
  engine: 'emulator', status: 'accepted', verdict: null, reason: null, results: {},
  engineRef: null, statusMessage: null, statusEventAt: null, resultEventAt: null, idempotencyKey: null, requestHash: null,
  createdAt: new Date(), updatedAt: new Date(), completedAt: null,
};

// The scenario starts as 'paused' so that the 'running' events below are a REAL scenario
// status change. The repository skips the scenario write when the status would not change.
function fixture(rows: (typeof row)[] = [row], currentRunId = row.id, scenarioStatus = 'paused') {
  const owner = { id: row.scenarioId, currentRunId, status: scenarioStatus };
  const lock = vi.fn().mockResolvedValueOnce([owner]).mockResolvedValueOnce(rows);
  const limit = vi.fn().mockResolvedValue(rows.map((r) => ({ scenarioId: r.scenarioId })));
  const selectWhere = vi.fn().mockImplementation(() => {
    return Object.assign(Promise.resolve([]), { for: lock, limit });
  });
  const updateWhere = vi.fn().mockResolvedValue([]);
  const set = vi.fn().mockReturnValue({ where: updateWhere });
  const tx = {
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: selectWhere }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    update: vi.fn().mockReturnValue({ set }),
  };
  const transaction = vi.fn(async (callback: (t: typeof tx) => Promise<unknown>) => callback(tx));
  const repository = new DrizzleRunEventRepository({ transaction } as unknown as DrizzleDB);
  return { repository, transaction, tx, lock, selectWhere, updateWhere, set };
}

const query = (sql: SQL) => new PgDialect().sqlToQuery(sql);

describe('DrizzleRunEventRepository', () => {
  it('locks by correlation ID and updates the matched primary key inside a transaction', async () => {
    const f = fixture();
    await expect(f.repository.apply(event)).resolves.toBe('updated');
    expect(f.transaction).toHaveBeenCalledOnce();
    expect(f.lock).toHaveBeenCalledWith('update');
    expect(query(f.selectWhere.mock.calls[0][0]).params).toEqual(['cid']);
    expect(query(f.selectWhere.mock.calls[1][0]).params).toEqual(['scenario-id']);
    expect(query(f.selectWhere.mock.calls[2][0]).params).toEqual(['cid']);
    expect(f.lock).toHaveBeenCalledTimes(2);
    expect(query(f.updateWhere.mock.calls[0][0]).params).toEqual(['run-id']);
    expect(query(f.updateWhere.mock.calls[1][0]).params).toEqual(['scenario-id', 'run-id']);
    expect(f.tx.update.mock.calls.map(([table]) => table)).toEqual([run, scenario]);
    expect(f.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'running', engineRunId: 'emu' }));
  });
  it('rejects unknown correlations without creating an orphan run', async () => {
    const f = fixture([]);
    await expect(f.repository.apply(event)).rejects.toThrow('No run exists');
    expect(f.tx.update).not.toHaveBeenCalled();
  });
  it('rejects an engine mismatch without writing', async () => {
    const f = fixture([{ ...row, engine: 'simulator' }]);
    await expect(f.repository.apply(event)).rejects.toThrow('identity');
    expect(f.tx.update).not.toHaveBeenCalled();
  });
  it('propagates writes failing inside the transaction', async () => {
    const f = fixture();
    f.updateWhere.mockRejectedValue(new Error('database unavailable'));
    await expect(f.repository.apply(event)).rejects.toThrow('database unavailable');
  });
  it('updates an older run without writing the current scenario', async () => {
    const f = fixture([row], 'newer-run-id');
    await expect(f.repository.apply(event)).resolves.toBe('updated');
    expect(f.tx.update).toHaveBeenCalledTimes(1);
    expect(f.tx.update).toHaveBeenCalledWith(run);
  });
  it('does not write the scenario when the mapped status is unchanged', async () => {
    const f = fixture([row], row.id, 'running');
    await expect(f.repository.apply(event)).resolves.toBe('updated');
    expect(f.tx.update.mock.calls.map(([table]) => table)).toEqual([run]);
  });
  it('does not write the scenario for a heartbeat on the current run', async () => {
    const f = fixture([{ ...row, status: 'running' }], row.id, 'running');
    const heartbeat: RunEvent = {
      event_type: 'run.heartbeat', correlation_id: 'cid', engine: 'emulator',
      emitted_at: '2026-10-09T12:54:00Z', progress: { n: 1 },
    };
    await expect(f.repository.apply(heartbeat)).resolves.toBe('updated');
    expect(f.tx.update.mock.calls.map(([table]) => table)).toEqual([run]);
  });
  it('propagates scenario write failures so the transaction can roll back both writes', async () => {
    const f = fixture();
    f.updateWhere.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('scenario update failed'));
    await expect(f.repository.apply(event)).rejects.toThrow('scenario update failed');
    expect(f.tx.update).toHaveBeenCalledTimes(2);
  });
});
