import { describe, expect, it } from 'vitest';
import type { RunState } from '../../runs/domain/run-state.js';
import { applyRunEvent, RunIdentityMismatchError } from './apply-run-event.js';
import { parseRunEvent, InvalidRunEventError, type RunEvent } from './run-event.js';

const time = new Date('2026-10-09T12:53:00Z');
const later = new Date('2026-10-09T23:10:00Z');
const stored: RunState = {
  id: 'id', correlationId: 'cid', engineRunId: null, scenarioId: 'scenario',
  engine: 'emulator', status: 'accepted', verdict: null, reason: null,
  results: {}, engineRef: null, statusMessage: null, statusEventAt: null,
  resultEventAt: null, createdAt: time, updatedAt: time, completedAt: null,
};
const status: RunEvent = {
  event_type: 'run.status', correlation_id: 'cid', run_id: 'emu_run',
  engine: 'emulator', status: 'running', emitted_at: time.toISOString(),
};
const result: RunEvent = {
  ...status, event_type: 'run.result', status: 'success', emitted_at: later.toISOString(),
  results: { duration_minutes: 720, orders: { total: 30240 }, metrics_ref: { grafana_url: 'https://example.com' } },
};

describe('run event validation', () => {
  it.each([status, result, { ...result, version: '' }])('accepts documented event envelopes', (event) => {
    expect(parseRunEvent(Buffer.from(JSON.stringify(event)))).toEqual(event);
  });
  it.each([
    null, Buffer.from('{'), Buffer.from('null'), Buffer.from('{}'),
    ...[
      { ...status, emitted_at: 'yesterday' }, { ...status, correlation_id: '' },
      { ...status, engine: 'unknown' }, { ...status, status: 'success' },
      { ...result, status: 'completed' }, { ...result, results: [] },
      { ...status, extra: true },
      { ...status, engine_ref: { instance_url: 'javascript:alert(1)', live_socket: 'ws://example.com' } },
    ].map((event) => Buffer.from(JSON.stringify(event))),
  ])('rejects invalid payloads', (value) => {
    expect(() => parseRunEvent(value)).toThrow(InvalidRunEventError);
  });
});

describe('applyRunEvent', () => {
  it('binds the engine run and preserves both live URLs and message', () => {
    const engine_ref = { instance_url: 'https://example.com', live_socket: 'wss://example.com' };
    expect(applyRunEvent(stored, { ...status, status: 'setup_ready', engine_ref, message: 'Ready' }, later))
      .toMatchObject({ engineRunId: 'emu_run', status: 'setup_ready', engineRef: JSON.stringify(engine_ref), statusMessage: 'Ready', statusEventAt: time, updatedAt: later });
  });
  it.each(['failed', 'interrupted', 'cancelled', 'completed'] as const)('records terminal status %s', (s) => {
    expect(applyRunEvent(stored, { ...status, status: s, reason: 'engine_error' }, later))
      .toMatchObject({ status: s, reason: 'engine_error', completedAt: time });
  });
  it.each(['success', 'failure', 'inconclusive'] as const)('stores result verdict %s separately from lifecycle status', (verdict) => {
    expect(applyRunEvent(stored, { ...result, status: verdict }, later))
      .toMatchObject({ status: 'completed', verdict, results: result.results, resultEventAt: later, completedAt: later });
  });
  it('stores results after a completed status with the same timestamp', () => {
    expect(applyRunEvent({ ...stored, status: 'completed', statusEventAt: later, completedAt: later }, result, later))
      .toMatchObject({ verdict: 'success', results: result.results });
  });
  it('preserves failure lifecycle and completion time when results arrive', () => {
    expect(applyRunEvent({ ...stored, status: 'failed', completedAt: time }, result, later))
      .toMatchObject({ status: 'failed', completedAt: time, verdict: 'success' });
  });
  it('ignores duplicate and older statuses', () => {
    for (const statusEventAt of [time, later]) {
      expect(applyRunEvent({ ...stored, statusEventAt }, status, later)).toBeNull();
    }
  });
  it('ignores duplicate and older results', () => {
    for (const resultEventAt of [later, new Date('2026-10-10T00:00:00Z')]) {
      expect(applyRunEvent({ ...stored, resultEventAt }, result, later)).toBeNull();
    }
  });
  it('cannot reopen a terminal run, even with a newer timestamp', () => {
    expect(applyRunEvent({ ...stored, status: 'completed' }, status, later)).toBeNull();
  });
  it.each(['failed', 'cancelled', 'interrupted', 'completed'] as const)(
    'keeps %s terminal despite newer or repeated status events', (finalStatus) => {
      const current = { ...stored, status: finalStatus, statusEventAt: time, completedAt: time };
      for (const incoming of ['accepted', 'running', 'paused', 'failed', 'cancelled', 'interrupted', 'completed'] as const) {
        expect(applyRunEvent(current, { ...status, status: incoming, emitted_at: later.toISOString() }, later)).toBeNull();
      }
    },
  );
  it('keeps completed after a conflicting failure arrives later', () => {
    const completed = { ...stored, ...applyRunEvent(stored, result, later) };
    expect(applyRunEvent(completed, { ...status, status: 'failed', emitted_at: later.toISOString() }, later)).toBeNull();
  });
  it('does not regress lifecycle stages', () => {
    expect(applyRunEvent({ ...stored, status: 'running' }, { ...status, status: 'accepted' }, later)).toBeNull();
  });
  it('allows pause and resume', () => {
    expect(applyRunEvent({ ...stored, status: 'running' }, { ...status, status: 'paused' }, later)?.status).toBe('paused');
    expect(applyRunEvent({ ...stored, status: 'paused' }, status, later)?.status).toBe('running');
  });
  it.each([
    { engine: 'simulator' as const }, { engineRunId: 'another-run' }, { correlationId: 'another-cid' },
  ])('rejects identity mismatches', (changes) => {
    expect(() => applyRunEvent({ ...stored, ...changes }, status, later)).toThrow(RunIdentityMismatchError);
  });
});
