import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants.js';
import type { DrizzleDB } from '../../db/db.module.js';
import { TRIGGER_UNDELIVERABLE, type RunCommand, type RunEngine } from '../../runs/domain/run.js';
import type { ClaimOptions, OutboxStats, OutboxStore } from '../application/ports.js';
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
  private readonly logger = new Logger(DrizzleOutboxStore.name);
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

  async renewLease(id: string, workerId: string, leaseMs: number) {
    return this.affected(sql`
      UPDATE run_outbox
      SET locked_until = now() + make_interval(secs => ${leaseMs}::double precision / 1000)
      WHERE id = ${id} AND locked_by = ${workerId} AND status = 'pending'
    `);
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
    return this.db.transaction(async (tx) => {
      const parked = await tx.execute<{ run_id: string; scenario_id: string; command_id: string }>(sql`
        UPDATE run_outbox
        SET status = 'dead', locked_by = NULL, locked_until = NULL, last_error = ${error}
        WHERE id = ${id} AND locked_by = ${workerId} AND status = 'pending'
        RETURNING run_id, scenario_id, command_id
      `);
      const row = parked.rows[0];
      if (!row) return false;
      if (row.command_id !== 'run') return true;

      // The broker never stored the trigger, so the engine cannot have the run: close it so the
      // user can retry. Lock order scenario → run, as the trigger and the status worker use.
      await tx.execute(sql`SELECT id FROM scenario WHERE id = ${row.scenario_id} FOR UPDATE`);
      const failed = await tx.execute(sql`
        UPDATE run
        SET status = 'failed', reason = ${TRIGGER_UNDELIVERABLE}, status_message = ${error},
            pending_command = NULL, completed_at = now(), updated_at = now()
        WHERE id = ${row.run_id} AND status = 'trigger_requested' AND last_event_sequence = 0
      `);
      if ((failed.rowCount ?? 0) > 0) {
        await tx.execute(sql`
          UPDATE scenario SET status = 'finished', updated_at = now()
          WHERE id = ${row.scenario_id} AND current_run_id = ${row.run_id}
        `);
        this.logger.warn({ event: 'run_trigger_undeliverable', run_id: row.run_id, scenario_id: row.scenario_id });
      }
      return true;
    });
  }

  async release(id: string, workerId: string) {
    return this.affected(sql`
      UPDATE run_outbox
      SET locked_by = NULL, locked_until = NULL, attempts = GREATEST(attempts - 1, 0)
      WHERE id = ${id} AND locked_by = ${workerId} AND status = 'pending'
    `);
  }

  /**
   * Cheap backlog snapshot: only touches pending rows, which the partial index run_outbox_due_idx
   * covers, so the table of published rows is never scanned. Dead rows are intentionally not
   * counted here (no index); the outbox_message_dead log and outbox.messages metric cover them.
   */
  async stats(): Promise<OutboxStats> {
    const result = await this.db.execute<{ pending: string | number; oldest_age_s: string | number | null }>(sql`
      SELECT count(*) AS pending,
             COALESCE(EXTRACT(EPOCH FROM (now() - min(created_at))), 0) AS oldest_age_s
      FROM run_outbox
      WHERE status = 'pending'
    `);
    const row = result.rows[0];
    return {
      pending: Number(row?.pending ?? 0),
      oldestPendingAgeSeconds: Math.max(0, Number(row?.oldest_age_s ?? 0)),
    };
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
