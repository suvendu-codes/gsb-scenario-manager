import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.module';
import { runEngine } from '../../db/schema/enums';
import { run } from '../../db/schema/run';
import type { RunRepository } from '../application/ports/run.repository';
import { DuplicateCorrelationIdError } from '../domain/errors';
import type { NewRun, Run } from '../domain/run';

type RunEngine = (typeof runEngine.enumValues)[number];

@Injectable()
export class DrizzleRunRepository implements RunRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByCorrelationId(correlationId: string) {
    const [row] = await this.db
      .select()
      .from(run)
      .where(eq(run.correlationId, correlationId))
      .limit(1);
    return row ? toRun(row) : null;
  }

  async create(input: NewRun) {
    try {
      const [created] = await this.db
        .insert(run)
        .values({
          scenarioId: input.scenarioId,
          correlationId: input.correlationId,
          engine: toEngine(input.engine),
        })
        .returning();
      return toRun(created);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === '23505') {
        throw new DuplicateCorrelationIdError(input.correlationId);
      }
      throw error;
    }
  }

  async update(
    runId: string,
    patch: { status?: Run['status']; engineRef?: string; engineRunId?: string; reason?: string },
  ) {
    const [updated] = await this.db
      .update(run)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(run.id, runId))
      .returning();
    return toRun(updated);
  }
}

const toRun = (row: typeof run.$inferSelect): Run => ({
  runId: row.id,
  scenarioId: row.scenarioId,
  correlationId: row.correlationId,
  engineRunId: row.engineRunId,
  reason: row.reason,
  status: row.status,
  engineRef: row.engineRef,
  createdAt: row.createdAt.toISOString(),
});

function toEngine(engine: string): RunEngine {
  const match = runEngine.enumValues.find((value) => value === engine);
  if (!match) throw new Error(`unsupported engine: ${engine}`);
  return match;
}
