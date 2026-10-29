import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants.js';
import type { DrizzleDB } from '../../db/db.module.js';
import type { RunCommand, RunEngine } from '../../runs/domain/run.js';
import type { ClaimOptions, OutboxStore } from '../application/ports.js';
import type { OutboxMessage } from '../domain/outbox-message.js';

type ClaimedRow = {
  id: string;
  scenario_id: string;
  run_id: string;
  correlation_id: string;
  engine: RunEngine;
  event_type: string;
  command_id: RunCommand;
  sequence: number;
  topic: string;
  message_key: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  attempts: number;
  created_at: Date | string;
};

@Injectable()
export class DrizzleOutboxStore implements OutboxStore {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async claimDue({ workerId, limit, leaseMs }: ClaimOptions): Promise<OutboxMessage[]> {
    // SKIP LOCKED lets several workers claim disjoint rows concurrently. The lease columns keep
    // a row invisible after this short transaction commits, while Kafka is being called.
    const result = await this.db.execute<ClaimedRow>(sql`
      WITH due AS (
        SELECT o.id
        FROM run_outbox o
        WHERE o.status = 'pending'
          AND o.available_at <= now()
          AND (o.locked_until IS NULL OR o.locked_until < now())
          AND NOT EXISTS (
            SELECT 1 FROM run_outbox earlier
            WHERE earlier.correlation_id = o.correlation_id
              AND earlier.sequence < o.sequence
              AND earlier.status <> 'published'
          )
        ORDER BY o.available_at, o.created_at
        LIMIT ${limit}
        FOR UPDATE OF o SKIP LOCKED
      )
      UPDATE run_outbox AS t
      SET locked_by = ${workerId},
          locked_until = now() + make_interval(secs => ${leaseMs}::double precision / 1000),
          attempts = t.attempts + 1
      FROM due
      WHERE t.id = due.id
      RETURNING t.id, t.scenario_id, t.run_id, t.correlation_id, t.engine, t.event_type,
                t.command_id, t.sequence, t.topic, t.message_key, t.payload, t.headers,
                t.attempts, t.created_at
    `);
    return result.rows
      .map(toMessage)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.sequence - b.sequence);
  }

  async markPublished(id: string, workerId: string) {
    return this.affected(sql`
      UPDATE run_outbox
      SET status = 'published', published_at = now(), locked_by = NULL, locked_until = NULL,
          last_error = NULL
      WHERE id = ${id} AND locked_by = ${workerId} AND status = 'pending'
    `);
  }

  async markRetry(id: string, workerId: string, error: string, delayMs: number) {
    return this.affected(sql`
      UPDATE run_outbox
      SET available_at = now() + make_interval(secs => ${delayMs}::double precision / 1000),
          locked_by = NULL, locked_until = NULL, last_error = ${error}
      WHERE id = ${id} AND locked_by = ${workerId} AND status = 'pending'
    `);
  }

  async markDead(id: string, workerId: string, error: string) {
    return this.affected(sql`
      UPDATE run_outbox
      SET status = 'dead', locked_by = NULL, locked_until = NULL, last_error = ${error}
      WHERE id = ${id} AND locked_by = ${workerId} AND status = 'pending'
    `);
  }

  async release(id: string, workerId: string) {
    return this.affected(sql`
      UPDATE run_outbox
      SET locked_by = NULL, locked_until = NULL, attempts = GREATEST(attempts - 1, 0)
      WHERE id = ${id} AND locked_by = ${workerId} AND status = 'pending'
    `);
  }

  private async affected(query: ReturnType<typeof sql>) {
    const result = await this.db.execute(query);
    return (result.rowCount ?? 0) > 0;
  }
}

const toMessage = (row: ClaimedRow): OutboxMessage => ({
  id: row.id,
  scenarioId: row.scenario_id,
  runId: row.run_id,
  correlationId: row.correlation_id,
  engine: row.engine,
  eventType: row.event_type,
  commandId: row.command_id,
  sequence: Number(row.sequence),
  topic: row.topic,
  messageKey: row.message_key,
  payload: row.payload,
  headers: row.headers ?? {},
  attempts: Number(row.attempts),
  createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
});
