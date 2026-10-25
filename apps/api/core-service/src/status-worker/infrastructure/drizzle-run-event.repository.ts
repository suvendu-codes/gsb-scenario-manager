import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants.js';
import type { DrizzleDB } from '../../db/db.module.js';
import { run } from '../../db/schema/run.js';
import { scenario } from '../../db/schema/scenario.js';
import { RunNotFoundError, type RunEventRepository } from '../application/ports/run-event.repository.js';
import { planRunEvents } from '../domain/plan-run-events.js';
import { runEventInbox } from '../../db/schema/run-event-inbox.js';
import type { RunEvent } from '../domain/run-event.js';
import { scenarioStatusForRun } from '../domain/scenario-run-state.js';

@Injectable()
export class DrizzleRunEventRepository implements RunEventRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async apply(event: RunEvent) {
    // OBSERVABILITY PLAN: instrument transaction/pool/lock wait durations and
    // sanitized DB failure categories (timeout/deadlock/connectivity/constraint).
    // Pool/lock telemetry needs driver/query support; total transaction latency
    // alone cannot identify lock wait. Never log SQL parameters/connection strings.
    // Emit a successful state-transition log only AFTER transaction() resolves,
    // not inside this callback: commit can still fail. Future diagnostic metadata
    // should include old/new run status and whether the current scenario changed.
    // Keep execution identifiers in logs only; DB rows remain the source of truth,
    // since a crash can occur between a commit and external metric/log emission.
    return this.db.transaction(async (tx) => {
      // Bound DB waits below the Kafka session timeout.
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      // Discover the immutable owner, then always lock scenario before run.
      // Trigger/retry writers must follow this order too.
      const [identity] = await tx.select({ scenarioId: run.scenarioId }).from(run)
        .where(eq(run.correlationId, event.correlation_id)).limit(1);
      if (!identity) throw new RunNotFoundError();
      const [owner] = await tx.select().from(scenario)
        .where(eq(scenario.id, identity.scenarioId)).for('update');
      if (!owner) throw new Error('Run scenario is missing');
      const [current] = await tx.select().from(run)
        .where(eq(run.correlationId, event.correlation_id)).for('update');
      // A trigger transaction may not have committed yet. Do not acknowledge it.
      if (!current) throw new RunNotFoundError();
      // The run lock serializes receipt insertion, replay, and normal delivery.
      // TODO: use a bounded replay job for large backlogs once recovery APIs exist.
      const receipts = event.event_type === 'run.heartbeat' ? [] : await tx.select().from(runEventInbox)
        .where(eq(runEventInbox.runId, current.id));
      const plan = planRunEvents(current, event, receipts.map(row => row.payload), new Date());
      if (plan.receipt) await tx.insert(runEventInbox).values({
        runId: current.id, sequence: plan.receipt.sequence, payload: plan.receipt,
      });
      const changes = plan.changes;
      if (!changes) return plan.outcome;
      await tx.update(run).set(changes).where(eq(run.id, current.id));
      const status = scenarioStatusForRun(owner, { ...current, ...changes });
      if (status !== null) {
        await tx.update(scenario).set({ status, updatedAt: changes.updatedAt })
          .where(and(eq(scenario.id, current.scenarioId), eq(scenario.currentRunId, current.id)));
      }
      // OBSERVABILITY PLAN: historical-run updates are expected, not errors.
      // Distinguish scenario-updated vs historical/no-current-owner outcomes in
      // future metadata; an ignored input must not count as a lifecycle transition.
      return plan.outcome;
    });
  }
}
