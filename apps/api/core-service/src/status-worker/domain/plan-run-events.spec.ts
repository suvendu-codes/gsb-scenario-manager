import { describe, expect, it } from 'vitest';
import type { RunState } from '../../runs/domain/run-state.js';
import { RunEventContractError } from './apply-run-event.js';
import { planRunEvents } from './plan-run-events.js';
import type { OrderedRunEvent, RunEvent } from './run-event.js';

const NOW = new Date('2026-10-28T10:00:00Z');
const base = { correlation_id: 'corr-1', engine: 'emulator' as const };
let tick = 0;
const at = () => new Date(Date.UTC(2026, 9, 28, 9, 0, tick++)).toISOString();

const status = (sequence: number, s: string, extra: object = {}) =>
  ({ ...base, event_type: 'run.status', sequence, status: s, emitted_at: at(), ...extra }) as OrderedRunEvent;
const failed = (sequence: number) => status(sequence, 'failed', { reason: 'engine crashed' });

function run(overrides: Partial<RunState> = {}): RunState {
  return {
    id: 'run-1', correlationId: 'corr-1', scenarioId: 'sc-1', engineRunId: null,
    engine: 'emulator', status: 'running', verdict: null, pendingCommand: null,
    commandSequence: null, decision: null, commandReason: null,
    lastEventSequence: 5, recoveryRequired: false,
    heartbeatEmittedAt: null, heartbeatReceivedAt: null, progress: null,
    reason: null, results: null, engineRef: null, statusMessage: null,
    statusEventAt: null, resultEventAt: null,
    createdAt: NOW, updatedAt: NOW, completedAt: null,
    ...overrides,
  };
}

describe('planRunEvents: held receipts that fail on replay', () => {
  it('commits the valid prefix and keeps the bad held receipt (review: terminal 6 then held 7)', () => {
    const held7 = status(7, 'running');   // invalid once 6 is terminal
    const held8 = status(8, 'running');
    const incoming6 = failed(6);

    const plan = planRunEvents(run(), incoming6, [held7, held8], NOW);

    expect(plan.changes).toMatchObject({ status: 'failed', lastEventSequence: 6, recoveryRequired: true });
    expect(plan.receipt).toEqual(incoming6);        // 6 is durably recorded
    expect(plan.outcome).toBe('held');
    expect((plan as { blockedSequence: number | null }).blockedSequence).toBe(7);
  });

  it('does not throw when a later valid event arrives behind an already blocked receipt', () => {
    const current = run({ status: 'failed', lastEventSequence: 6, recoveryRequired: true, completedAt: NOW });
    const held7 = status(7, 'running');
    const incoming9 = status(9, 'running');

    const plan = planRunEvents(current, incoming9, [failed(6), held7], NOW);

    expect(plan.receipt).toEqual(incoming9);
    expect(plan.changes).toMatchObject({ recoveryRequired: true });
    expect(plan.changes).not.toHaveProperty('lastEventSequence');
    expect(plan.outcome).toBe('held');
  });

  it('redelivery of the blocked receipt itself is acknowledged, not re-raised', () => {
    const current = run({ status: 'failed', lastEventSequence: 6, recoveryRequired: true, completedAt: NOW });
    const held7 = status(7, 'running');

    const plan = planRunEvents(current, held7, [held7], NOW);

    expect(plan.receipt).toBeNull();                // already stored
    expect(plan.outcome).toBe('held');
  });

  it('still rejects (and rolls back) when the INCOMING event violates the rules', () => {
    const current = run({ status: 'failed', lastEventSequence: 5, completedAt: NOW });
    expect(() => planRunEvents(current, status(6, 'running'), [], NOW)).toThrow(RunEventContractError);
  });

  it('still rejects when the incoming event is the failing one after a valid held prefix', () => {
    // held 6 is valid and terminal; incoming 7 is not allowed after it.
    expect(() => planRunEvents(run(), status(7, 'running'), [failed(6)], NOW)).toThrow(RunEventContractError);
  });
});

describe('planRunEvents: normal ordering', () => {
  it('drains a valid held prefix when the gap closes', () => {
    const plan = planRunEvents(run(), status(6, 'running'), [status(7, 'paused')], NOW);
    expect(plan.changes).toMatchObject({ status: 'paused', lastEventSequence: 7, recoveryRequired: false });
    expect(plan.outcome).toBe('updated');
  });

  it('holds a future event behind a gap without applying it', () => {
    const plan = planRunEvents(run(), status(8, 'running'), [], NOW);
    expect(plan.changes).toEqual({ recoveryRequired: true });
    expect(plan.receipt?.sequence).toBe(8);
    expect(plan.outcome).toBe('held');
  });

  it('ignores a verified duplicate of an applied sequence', () => {
    const e5 = status(5, 'running');
    const plan = planRunEvents(run(), e5, [e5], NOW);
    expect(plan).toMatchObject({ changes: null, receipt: null, outcome: 'ignored' });
  });

  it('rejects a changed payload under an existing sequence', () => {
    const stored = status(5, 'running');
    expect(() => planRunEvents(run(), { ...stored, status: 'paused' } as RunEvent, [stored], NOW))
      .toThrow(RunEventContractError);
  });

  it('rejects an applied sequence whose receipt is missing (integrity problem)', () => {
    expect(() => planRunEvents(run(), status(5, 'running'), [], NOW)).toThrow(RunEventContractError);
  });
});
