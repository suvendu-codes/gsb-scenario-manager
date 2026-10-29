import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants.js';
import type { DrizzleDB } from '../../db/db.module.js';
import { isUniqueViolation } from '../../db/pg-errors.js';
import { run } from '../../db/schema/run.js';
import { scenario } from '../../db/schema/scenario.js';
import { insertOutboxMessage } from '../../outbox/infrastructure/outbox-writer.js';
import { ScenarioNotFoundError } from '../../scenarios/domain/errors.js';
import type {
  CommitTrigger,
  RunTriggerRepository,
  TriggerOutcome,
  TriggerScenarioState,
} from '../application/ports/run-trigger.repository.js';
import { isTerminalRunStatus, type Run } from '../domain/run.js';

type StoredConfig = { configUri?: string; body?: Record<string, unknown> };

@Injectable()
export class DrizzleRunTriggerRepository implements RunTriggerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByIdempotencyKey(scenarioId: string, key: string) {
    const [row] = await this.db
      .select()
      .from(run)
      .where(and(eq(run.scenarioId, scenarioId), eq(run.idempotencyKey, key)))
      .limit(1);
    return row ? toRun(row) : null;
  }

  async loadScenario(scenarioId: string, recentRuns: number): Promise<TriggerScenarioState | null> {
    const [row] = await this.db.select().from(scenario).where(eq(scenario.id, scenarioId)).limit(1);
    if (!row) return null;
    const runs = await this.db
      .select({ id: run.id, correlationId: run.correlationId, status: run.status, reason: run.reason })
      .from(run)
      .where(eq(run.scenarioId, scenarioId))
      .orderBy(desc(run.createdAt), desc(run.id))
      .limit(recentRuns);
    const stored = (row.config ?? {}) as StoredConfig;
    return {
      id: row.id,
      projectId: row.projectId,
      mapId: row.mapId,
      status: row.status,
      config: { body: stored.body ?? null, uri: stored.configUri ?? null },
      dataUris: {
        inbound: row.inboundUri,
        outbound: row.outboundUri,
        masterdata: row.masterdataUri,
        mockput: row.mockputUri,
      },
      recentRuns: runs,
    };
  }

  async commit(input: CommitTrigger): Promise<TriggerOutcome> {
    try {
      return await this.db.transaction(async (tx) => {
        // Serialises triggers for one scenario; everything below sees the committed state.
        const [locked] = await tx.select().from(scenario).where(eq(scenario.id, input.scenarioId)).for('update');
        if (!locked) throw new ScenarioNotFoundError(input.scenarioId);

        const [existing] = await tx
          .select()
          .from(run)
          .where(and(eq(run.scenarioId, input.scenarioId), eq(run.idempotencyKey, input.idempotencyKey)))
          .limit(1);
        if (existing) return { kind: 'existing', run: toRun(existing) } as const;

        const [latest] = await tx
          .select({ id: run.id, correlationId: run.correlationId, status: run.status })
          .from(run)
          .where(eq(run.scenarioId, input.scenarioId))
          .orderBy(desc(run.createdAt), desc(run.id))
          .limit(1);
        if (locked.status !== input.expected.status || (latest?.id ?? null) !== input.expected.latestRunId) {
          return {
            kind: 'changed',
            status: locked.status,
            activeRunCorrelationId: latest && !isTerminalRunStatus(latest.status) ? latest.correlationId : null,
          } as const;
        }

        const [created] = await tx.insert(run).values(input.run).returning();
        await insertOutboxMessage(tx, input.outbox);
        // current_run_id is what lets the status worker move this scenario with the run.
        await tx
          .update(scenario)
          .set({ status: 'running', currentRunId: created.id, updatedAt: new Date() })
          .where(eq(scenario.id, input.scenarioId));

        return { kind: 'created', run: toRun(created) } as const;
      });
    } catch (error) {
      if (isUniqueViolation(error, 'run_one_active_per_scenario')) {
        return { kind: 'changed', status: 'running', activeRunCorrelationId: null };
      }
      if (isUniqueViolation(error, 'run_scenario_idempotency_key')) {
        const winner = await this.findByIdempotencyKey(input.scenarioId, input.idempotencyKey);
        if (winner) return { kind: 'existing', run: winner };
      }
      throw error;
    }
  }
}

const toRun = (row: typeof run.$inferSelect): Run => ({
  id: row.id,
  scenarioId: row.scenarioId,
  correlationId: row.correlationId,
  engine: row.engine,
  status: row.status,
  priority: row.priority,
  pendingCommand: row.pendingCommand,
  commandSequence: row.commandSequence,
  retryOfRunId: row.retryOfRunId,
  triggeredBy: row.triggeredBy ?? 'system',
  mapVersion: row.mapVersion,
  sizerVersion: row.sizerVersion,
  configSnapshotUri: row.configSnapshotUri,
  idempotencyKey: row.idempotencyKey,
  requestHash: row.requestHash,
  createdAt: row.createdAt,
});
