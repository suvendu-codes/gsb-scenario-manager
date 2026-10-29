import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants.js';
import type { DrizzleDB } from '../../db/db.module.js';
import { isUniqueViolation } from '../../db/pg-errors.js';
import { run } from '../../db/schema/run.js';
import { scenario } from '../../db/schema/scenario.js';
import { insertOutboxMessage } from '../../outbox/infrastructure/outbox-writer.js';
import { ScenarioNotFoundError } from '../../scenarios/domain/errors.js';
import type {
  RunTriggerRepository,
  TriggerContext,
  TriggerOutcome,
  TriggerPlan,
} from '../application/ports/run-trigger.repository.js';
import { ActiveRunExistsError, IdempotencyKeyReusedError } from '../domain/errors.js';
import { TERMINAL_RUN_STATUSES, type Run } from '../domain/run.js';

@Injectable()
export class DrizzleRunTriggerRepository implements RunTriggerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async trigger(
    scenarioId: string,
    idempotencyKey: string | null,
    plan: (ctx: TriggerContext) => TriggerPlan,
  ): Promise<TriggerOutcome> {
    try {
      return await this.db.transaction(async (tx) => {
        // Serialises triggers (and future commands) for one scenario.
        const [locked] = await tx
          .select()
          .from(scenario)
          .where(eq(scenario.id, scenarioId))
          .for('update');
        if (!locked) throw new ScenarioNotFoundError(scenarioId);

        if (idempotencyKey) {
          const [existing] = await tx
            .select()
            .from(run)
            .where(and(eq(run.scenarioId, scenarioId), eq(run.idempotencyKey, idempotencyKey)))
            .limit(1);
          if (existing) return { kind: 'existing', run: toRun(existing) } as const;
        }

        const [active] = await tx
          .select({ id: run.id, status: run.status })
          .from(run)
          .where(
            and(eq(run.scenarioId, scenarioId), notInArray(run.status, [...TERMINAL_RUN_STATUSES])),
          )
          .orderBy(desc(run.createdAt))
          .limit(1);

        const planned = plan({
          scenario: {
            id: locked.id,
            projectId: locked.projectId,
            mapId: locked.mapId,
            status: locked.status,
            dataUris: {
              inbound: locked.inboundUri,
              outbound: locked.outboundUri,
              masterdata: locked.masterdataUri,
              mockput: locked.mockputUri,
            },
          },
          activeRun: active ?? null,
        });

        const [created] = await tx.insert(run).values(planned.run).returning();
        await insertOutboxMessage(tx, planned.outbox);
        await tx
          .update(scenario)
          // current_run_id is what lets the status worker move this scenario with the run.
          .set({ status: planned.scenarioStatus, currentRunId: created.id, updatedAt: new Date() })
          .where(eq(scenario.id, scenarioId));

        return { kind: 'created', run: toRun(created), outboxId: planned.outbox.id } as const;
      });
    } catch (error) {
      if (isUniqueViolation(error, 'run_one_active_per_scenario')) {
        throw new ActiveRunExistsError(scenarioId);
      }
      if (isUniqueViolation(error, 'run_scenario_idempotency_key')) {
        throw new IdempotencyKeyReusedError(idempotencyKey ?? '');
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
  pendingCommand: row.pendingCommand,
  commandSequence: row.commandSequence,
  idempotencyKey: row.idempotencyKey,
  requestHash: row.requestHash,
  createdAt: row.createdAt,
});
