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

/**
 * THIS IS WHERE EVENTS ARE SAVED (PostgreSQL, through the Drizzle query builder).
 *
 * apply() = one database TRANSACTION per Kafka message: either everything below is saved, or
 * nothing is (an exception rolls it all back, and Kafka will redeliver the message).
 *
 * Tables involved:
 *   scenario          one row per scenario; `current_run_id` points at its latest run
 *   run               one row per execution/retry; found by its unique `correlation_id`
 *   run_event_inbox   receipt ledger: every sequenced event we accepted, applied or still waiting
 *
 * The decisions themselves ("is this transition allowed?", "is there a gap?") are NOT here; they are
 * pure functions in domain/plan-run-events.ts and domain/apply-run-event.ts. This class only
 * loads rows, calls them, and writes the result.
 */
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
      // STEP 0 - Safety timeouts. "SET LOCAL" lasts only for this transaction. If a query or a lock
      // wait takes too long we fail (and Kafka retries) instead of freezing past the Kafka session timeout.
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      // STEP 1 - Which run is this about? Look it up by correlation ID (the id the trigger flow
      // generated and the engine echoes back). We only need its scenario id, to lock in the right order.
      // Locking order is ALWAYS scenario first, then run; anyone else writing both (trigger/retry code)
      // must do the same, otherwise two transactions can wait on each other forever (deadlock).
      const [identity] = await tx.select({ scenarioId: run.scenarioId }).from(run)
        .where(eq(run.correlationId, event.correlation_id)).limit(1);
      // Unknown correlation = an event for a run we never created. Never create runs from events.
      if (!identity) throw new RunNotFoundError();
      // STEP 2 - Lock the scenario row. `.for('update')` = SQL "SELECT ... FOR UPDATE": other transactions
      // wanting this row wait until we commit. This is what serializes several workers / topics.
      const [owner] = await tx.select().from(scenario)
        .where(eq(scenario.id, identity.scenarioId)).for('update');
      if (!owner) throw new Error('Run scenario is missing');
      // STEP 3 - Lock and load the run row (re-read now that we hold the scenario lock, so the data is current).
      const [current] = await tx.select().from(run)
        .where(eq(run.correlationId, event.correlation_id)).for('update');
      // A trigger transaction may not have committed yet. Do not acknowledge it.
      if (!current) throw new RunNotFoundError();
      // STEP 4 - Load the receipt ledger: events of this run we already accepted (applied ones, plus
      // future ones parked behind a gap). Heartbeats are not sequenced, so they have no receipts.
      // The run lock serializes receipt insertion, replay, and normal delivery.
      // TODO: use a bounded replay job for large backlogs once recovery APIs exist.
      const receipts = event.event_type === 'run.heartbeat' ? [] : await tx.select().from(runEventInbox)
        .where(eq(runEventInbox.runId, current.id));
      // STEP 5 - THE DECISION (pure code, no database): compare the event with the current run state
      // and the stored receipts. Result: what to change on the run, which receipt to store, and the
      // outcome. Throws if the event breaks the rules (then everything rolls back). See plan-run-events.ts.
      const plan = planRunEvents(current, event, receipts.map(row => row.payload), new Date());
      // STEP 6 - Store the receipt FIRST (same transaction as the state change, so they commit together).
      // Its primary key (run_id, sequence) also stops two writers from inserting the same sequence.
      if (plan.receipt) await tx.insert(runEventInbox).values({
        runId: current.id, sequence: plan.receipt.sequence, payload: plan.receipt,
      });
      const changes = plan.changes;
      // Nothing to change (exact duplicate, stale heartbeat): done; the Kafka message is still acknowledged.
      if (!changes) return plan.outcome;
      // STEP 7 - Write the run changes (status, results, heartbeat, last_event_sequence, ...).
      await tx.update(run).set(changes).where(eq(run.id, current.id));
      // STEP 8 - Mirror the run's state onto its scenario, but ONLY if this run is the scenario's
      // current_run_id (a late event of an OLD retry must never change the scenario), and ONLY if the
      // scenario status would actually change. Without that check every heartbeat on the hot path
      // would rewrite the scenario row for nothing (and hold its lock longer).
      const status = scenarioStatusForRun(owner, { ...current, ...changes });
      if (status !== null && status !== owner.status) {
        await tx.update(scenario).set({ status, updatedAt: changes.updatedAt ?? new Date() })
          .where(and(eq(scenario.id, current.scenarioId), eq(scenario.currentRunId, current.id)));
      }
      // Returning normally COMMITS the transaction (Drizzle commits when the callback resolves, rolls
      // back when it throws). Only after that does StatusWorker acknowledge the Kafka message.
      // OBSERVABILITY PLAN: historical-run updates are expected, not errors.
      // Distinguish scenario-updated vs historical/no-current-owner outcomes in
      // future metadata; an ignored input must not count as a lifecycle transition.
      return plan.outcome;
    });
  }
}
