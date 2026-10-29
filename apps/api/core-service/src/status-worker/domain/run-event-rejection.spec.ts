import { seed as contractSeed } from '../../../test/fixtures/run-state.js';
import { describe, expect, it } from 'vitest';
import { parseRunEvent, InvalidRunEventError } from './run-event.js';
import { applyRunEvent } from './apply-run-event.js';
import { RunNotFoundError } from '../application/ports/run-event.repository.js';
import { RunEventRejectedError, type RunEventRejectionCode } from './run-event-rejection.js';
import type { RunState } from '../../runs/domain/run-state.js';

const event = { event_type: 'run.status', correlation_id: 'cid', run_id: 'engine-run',
  engine: 'emulator', sequence: 1, status: 'running', emitted_at: '2026-10-25T06:00:00Z' };
const buffer = (value: unknown) => Buffer.from(JSON.stringify(value));
const invalidCases: Array<[string, Buffer | null, RunEventRejectionCode]> = [
  ['null body', null, 'empty_event'], ['empty body', Buffer.alloc(0), 'empty_event'],
  ['malformed JSON', Buffer.from('{sensitive-payload'), 'malformed_json'],
  ['null JSON', buffer(null), 'invalid_event_schema'], ['array JSON', buffer([]), 'invalid_event_schema'],
  ['both IDs missing', buffer({ ...event, correlation_id: undefined, run_id: undefined }), 'invalid_correlation_id'],
  ['both IDs blank', buffer({ ...event, correlation_id: ' ', run_id: ' ' }), 'invalid_execution_identity'],
  ['correlation missing', buffer({ ...event, correlation_id: undefined }), 'invalid_correlation_id'],
  ['correlation blank', buffer({ ...event, correlation_id: ' ' }), 'invalid_correlation_id'],
  ['correlation null', buffer({ ...event, correlation_id: null }), 'invalid_correlation_id'],
  ['correlation wrong type', buffer({ ...event, correlation_id: 42 }), 'invalid_correlation_id'],
  ['engine run blank', buffer({ ...event, run_id: ' ' }), 'invalid_engine_run_id'],
  ['engine run null', buffer({ ...event, run_id: null }), 'invalid_engine_run_id'],
  ['engine run wrong type', buffer({ ...event, run_id: 42 }), 'invalid_engine_run_id'],
  ['bad status', buffer({ ...event, status: 'invalid' }), 'invalid_event_schema'],
  ['bad engine', buffer({ ...event, engine: 'invalid' }), 'invalid_event_schema'],
  ['bad timestamp', buffer({ ...event, emitted_at: 'invalid' }), 'invalid_event_schema'],
  ['unexpected property', buffer({ ...event, secret: 'sensitive-payload' }), 'invalid_event_schema'],
];

describe('run event rejection reasons', () => {
  it.each(invalidCases)('classifies %s without preserving the input', (_name, input, code) => {
    try {
      parseRunEvent(input);
      expect.fail('Input should be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidRunEventError);
      expect(error).toBeInstanceOf(RunEventRejectedError);
      expect(error).toMatchObject({ code, message: 'Invalid run event' });
      expect(JSON.stringify(error)).not.toContain('sensitive-payload');
    }
  });

  it('keeps unknown correlation distinct from an invalid envelope', () => {
    expect(new RunNotFoundError()).toBeInstanceOf(RunEventRejectedError);
    expect(new RunNotFoundError()).toHaveProperty('code', 'unknown_correlation');
  });

  const stored: RunState = {
    ...contractSeed, id: 'internal-run', scenarioId: 'scenario', correlationId: 'cid', engineRunId: 'engine-run',
    engine: 'emulator', status: 'running', verdict: null, reason: null, results: {},
    engineRef: null, statusMessage: null, statusEventAt: null, resultEventAt: null,
    createdAt: new Date(), updatedAt: new Date(), completedAt: null,
  };
  it.each([
    [{ correlationId: 'other' }, 'correlation_mismatch'],
    [{ engine: 'simulator' as const }, 'engine_mismatch'],
    [{ engineRunId: 'other' }, 'engine_run_id_mismatch'],
  ] as const)('classifies identity conflict %j', (changes, code) => {
    const current = { ...stored, ...changes };
    const before = structuredClone(current);
    expect(() => applyRunEvent(current, parseRunEvent(buffer(event)), new Date()))
      .toThrowError(expect.objectContaining({ code }));
    expect(current).toEqual(before);
  });

  it('allows first-response binding without treating a null stored run ID as unknown', () => {
    expect(applyRunEvent({ ...stored, engineRunId: null }, parseRunEvent(buffer(event)), new Date()))
      .toMatchObject({ engineRunId: 'engine-run', status: 'running' });
  });
});
