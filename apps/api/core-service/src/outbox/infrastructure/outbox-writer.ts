import type { DrizzleDB } from '../../db/db.module.js';
import { runOutbox } from '../../db/schema/run-outbox.js';
import type { OutboxMessageDraft } from '../domain/outbox-message.js';

export type DrizzleTx = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

/**
 * Inserts a command event into the outbox. Call it with the SAME transaction that changes the
 * run, so the event exists if and only if the state change committed.
 */
export async function insertOutboxMessage(tx: DrizzleTx | DrizzleDB, draft: OutboxMessageDraft) {
  await tx.insert(runOutbox).values({
    id: draft.id,
    scenarioId: draft.scenarioId,
    runId: draft.runId,
    correlationId: draft.correlationId,
    engine: draft.engine,
    eventType: draft.eventType,
    commandId: draft.commandId,
    sequence: draft.sequence,
    topic: draft.topic,
    messageKey: draft.messageKey,
    payload: draft.payload,
    headers: draft.headers,
  });
}
