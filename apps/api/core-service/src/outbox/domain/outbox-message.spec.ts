import { describe, expect, it } from 'vitest';
import { createOutboxMessage } from './outbox-message.js';

describe('createOutboxMessage', () => {
  const event = {
    event_type: 'run.pause',
    command_id: 'pause' as const,
    engine: 'simulator' as const,
    sequence: 3,
    correlation_id: 'cid_x',
    issued_at: '2026-10-25T09:59:59Z',
  };

  it('keys by correlation_id and copies routing fields from the event', () => {
    const draft = createOutboxMessage({ id: 'o-1', scenarioId: 's-1', runId: 'r-1', topic: 'sim.cmd', event });
    expect(draft).toEqual({
      id: 'o-1',
      scenarioId: 's-1',
      runId: 'r-1',
      correlationId: 'cid_x',
      engine: 'simulator',
      eventType: 'run.pause',
      commandId: 'pause',
      sequence: 3,
      topic: 'sim.cmd',
      messageKey: 'cid_x',
      payload: event,
      headers: {
        event_id: 'o-1',
        event_type: 'run.pause',
        correlation_id: 'cid_x',
        'content-type': 'application/json',
      },
    });
  });

  it('adds schema_version only when the event carries a version', () => {
    const draft = createOutboxMessage({
      id: 'o-2',
      scenarioId: 's',
      runId: 'r',
      topic: 't',
      event: { ...event, version: '1.1' },
    });
    expect(draft.headers.schema_version).toBe('1.1');
  });
});
