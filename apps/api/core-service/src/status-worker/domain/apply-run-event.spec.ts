import { describe, expect, it } from 'vitest';
import { seed, status, result, time } from '../../../test/fixtures/run-state.js';
import { applyRunEvent, RunEventContractError, RunIdentityMismatchError } from './apply-run-event.js';
import { parseRunEvent } from './run-event.js';

const parse = (event: unknown) => parseRunEvent(Buffer.from(JSON.stringify(event)));
describe('event contract validation', () => {
  it('accepts responses without an engine identifier', () => {
    expect(parse(status({ run_id: undefined }))).not.toHaveProperty('run_id');
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, undefined])('rejects invalid sequence %s', sequence => {
    expect(() => parse({ ...status(), sequence })).toThrow();
  });
  it.each([
    { command_id: 'pause' }, { decision: 'accepted' },
    { command_id: 'pause', command_sequence: 1, decision: 'rejected' },
    { command_id: 'run', command_sequence: 1, decision: 'rejected', reason: 'invalid' },
    { status: 'failed' }, { run_id: '' }, { correlation_id: '' }, { extra: true },
    { status: 'pausing' }, { status: 'cancelling' },
  ])('rejects incomplete or invalid contract %j', override => {
    expect(() => parse({ ...status(), ...override })).toThrow();
  });
  it('rejects the removed result verdict field', () => {
    expect(() => parse({ ...result(), status: 'success' })).toThrow();
  });
});
describe('confirmed execution and command rules', () => {
  it('uses sequence rather than producer timestamp for ordering', () => {
    expect(applyRunEvent({ ...seed, statusEventAt: new Date('2030-01-01') }, status(), time))
      .toMatchObject({ status: 'running', lastEventSequence: 1 });
  });
  it('preserves bound engine ID when omitted and rejects conflicts', () => {
    const current = { ...seed, engineRunId: 'engine-run' };
    expect(applyRunEvent(current, status({ run_id: undefined }), time)).not.toHaveProperty('engineRunId');
    expect(() => applyRunEvent(current, status({ run_id: 'other' }), time)).toThrow(RunIdentityMismatchError);
  });
  it.each(['pause', 'resume', 'cancel', 'run'] as const)('acceptance keeps %s pending before its destination', command => {
    const state = command === 'resume' ? 'paused' : 'accepted';
    const next = command === 'resume' ? 'resuming' : 'setup_ready';
    expect(applyRunEvent({ ...seed, status: state, pendingCommand: command, commandSequence: 3 },
      status({ status: next, command_id: command, command_sequence: 3, decision: 'accepted' }), time))
      .toMatchObject({ decision: 'accepted' });
    expect(applyRunEvent({ ...seed, status: state, pendingCommand: command, commandSequence: 3 },
      status({ status: next, command_id: command, command_sequence: 3, decision: 'accepted' }), time))
      .not.toHaveProperty('pendingCommand');
  });
  it.each([['pause', 'running', 'paused'], ['resume', 'paused', 'running'],
    ['run', 'accepted', 'running'], ['cancel', 'running', 'cancelled']] as const)
    ('clears %s only on its correlated destination', (command, from, to) => {
      const current = { ...seed, status: from, pendingCommand: command, commandSequence: 3 };
      expect(applyRunEvent(current, status({ status: to, command_id: command, command_sequence: 3, decision: 'accepted' }), time))
        .toMatchObject({ status: to, pendingCommand: null });
    });
  it('an unrelated paused state cannot clear a pending pause', () => {
    expect(applyRunEvent({ ...seed, status: 'running', pendingCommand: 'pause', commandSequence: 3 }, status({ status: 'paused' }), time))
      .not.toHaveProperty('pendingCommand');
  });
  it('rejects a response for an older command request', () => {
    expect(() => applyRunEvent({ ...seed, pendingCommand: 'pause', commandSequence: 4 },
      status({ command_id: 'pause', command_sequence: 3, decision: 'rejected', reason: 'busy' }), time)).toThrow();
  });
  it.each(['pause', 'resume', 'cancel'] as const)('rejected %s clears request and preserves state', command => {
    expect(applyRunEvent({ ...seed, status: 'running', pendingCommand: command, commandSequence: 3 },
      status({ command_id: command, command_sequence: 3, decision: 'rejected', reason: 'unsupported' }), time))
      .toMatchObject({ status: 'running', pendingCommand: null, commandReason: 'unsupported', decision: 'rejected' });
  });
  it('Run rejection explicitly fails without an engine run ID', () => {
    expect(applyRunEvent({ ...seed, status: 'trigger_requested', pendingCommand: 'run', commandSequence: 1 },
      status({ run_id: undefined, status: 'failed', reason: 'invalid', command_id: 'run', command_sequence: 1, decision: 'rejected' }), time))
      .toMatchObject({ status: 'failed', reason: 'invalid', pendingCommand: null, completedAt: time });
  });
  it.each(['completed', 'failed', 'cancelled'] as const)('terminal %s clears any pending request', final => {
    expect(applyRunEvent({ ...seed, pendingCommand: 'pause', commandSequence: 3 }, status({ status: final, reason: 'engine_reason' }), time))
      .toMatchObject({ status: final, pendingCommand: null, completedAt: time });
  });
  it.each(['completed', 'failed'] as const)('stores opaque results after %s without changing outcome', final => {
    expect(applyRunEvent({ ...seed, status: final, lastEventSequence: 1, completedAt: time }, result(), time))
      .toMatchObject({ results: result().results, resultEventAt: time, lastEventSequence: 2 });
    expect(applyRunEvent({ ...seed, status: final, lastEventSequence: 1, completedAt: time }, result(), time))
      .not.toHaveProperty('status');
  });
  it.each(['running', 'cancelled'] as const)('rejects result for %s', state => {
    expect(() => applyRunEvent({ ...seed, status: state, lastEventSequence: 1 }, result(), time)).toThrow(RunEventContractError);
  });
  it('terminal outcomes cannot be changed by later statuses', () => {
    expect(() => applyRunEvent({ ...seed, status: 'completed' }, status({ status: 'failed', reason: 'x' }), time)).toThrow();
  });
  it('heartbeat records health without changing lifecycle or pending commands', () => {
    const changes = applyRunEvent(seed, { event_type: 'run.heartbeat', correlation_id: 'cid', engine: 'emulator',
      emitted_at: time.toISOString(), progress: { processed: 10 } }, time);
    expect(changes).toMatchObject({ heartbeatReceivedAt: time, progress: { processed: 10 } });
    expect(changes).not.toHaveProperty('status');
    expect(changes).not.toHaveProperty('pendingCommand');
    expect(changes).not.toHaveProperty('lastEventSequence');
  });
  it('replayed heartbeat cannot refresh freshness', () => {
    expect(applyRunEvent({ ...seed, heartbeatEmittedAt: time }, { event_type: 'run.heartbeat', correlation_id: 'cid',
      engine: 'emulator', emitted_at: time.toISOString() }, new Date())).toBeNull();
  });
});

it('terminal state clears the request even when command metadata references an older action', () => {
  expect(applyRunEvent({ ...seed, pendingCommand: 'pause', commandSequence: 5 }, status({
    status: 'failed', reason: 'engine_failed', command_id: 'run', command_sequence: 1, decision: 'accepted',
  }), time)).toMatchObject({ status: 'failed', pendingCommand: null });
});
