import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants.js';
import type { DrizzleDB } from '../../db/db.module.js';
import { run } from '../../db/schema/run.js';
import { scenario } from '../../db/schema/scenario.js';
import { RunNotFoundError, type RunEventRepository } from '../application/ports/run-event.repository.js';
import { applyRunEvent } from '../domain/apply-run-event.js';
import type { RunEvent } from '../domain/run-event.js';
import { scenarioStatusForRun } from '../domain/scenario-run-state.js';

@Injectable()
export class DrizzleRunEventRepository implements RunEventRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async apply(event: RunEvent) {
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
      const changes = applyRunEvent(current, event, new Date());
      if (!changes) return 'ignored' as const;
      await tx.update(run).set(changes).where(eq(run.id, current.id));
      const status = scenarioStatusForRun(owner, { ...current, ...changes });
      if (status !== null) {
        await tx.update(scenario).set({ status, updatedAt: changes.updatedAt })
          .where(and(eq(scenario.id, current.scenarioId), eq(scenario.currentRunId, current.id)));
      }
      return 'updated' as const;
    });
  }
}
