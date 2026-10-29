import type { RunCommand, RunEngine } from '../../runs/domain/run.js';

/** A command event ready to be written to `run_outbox` (inside the caller's transaction). */
export interface OutboxMessageDraft {
  id: string;
  scenarioId: string;
  runId: string;
  correlationId: string;
  engine: RunEngine;
  eventType: string;
  commandId: RunCommand;
  sequence: number;
  topic: string;
  messageKey: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}

/** A row leased by a worker for delivery. */
export interface OutboxMessage extends OutboxMessageDraft {
  /** Attempts including the current one (incremented when claimed). */
  attempts: number;
  createdAt: Date;
}

export type OutboxStatus = 'pending' | 'published' | 'dead';

export interface CommandEnvelope {
  event_type: string;
  command_id: RunCommand;
  engine: RunEngine;
  sequence: number;
  correlation_id: string;
  version?: string;
}

/**
 * Wraps a fully built command event. Kafka key = correlation_id so an execution's commands stay
 * on one partition (Event Schema §4). `event_id` lets consumers log/trace a specific delivery;
 * engine deduplication uses (correlation_id, sequence).
 */
export function createOutboxMessage(args: {
  id: string;
  scenarioId: string;
  runId: string;
  topic: string;
  event: CommandEnvelope & Record<string, unknown>;
}): OutboxMessageDraft {
  const { id, scenarioId, runId, topic, event } = args;
  return {
    id,
    scenarioId,
    runId,
    correlationId: event.correlation_id,
    engine: event.engine,
    eventType: event.event_type,
    commandId: event.command_id,
    sequence: event.sequence,
    topic,
    messageKey: event.correlation_id,
    payload: event,
    headers: {
      event_id: id,
      event_type: event.event_type,
      correlation_id: event.correlation_id,
      ...(event.version ? { schema_version: event.version } : {}),
      'content-type': 'application/json',
    },
  };
}
