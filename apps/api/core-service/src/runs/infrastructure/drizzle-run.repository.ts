import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.module';
import { run } from '../../db/schema/run';
import type { RunRepository } from '../application/ports/run.repository';
import { DuplicateIdempotencyKeyError } from '../domain/errors';
import type { NewRun, Run } from '../domain/run';

@Injectable()
export class DrizzleRunRepository implements RunRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByIdempotencyKey(key: string) {
    const [row] = await this.db
      .select()
      .from(run)
      .where(eq(run.idempotencyKey, key))
      .limit(1);
    return row ? toRun(row) : null;
  }

  async create(input: NewRun) {
    try {
      const [created] = await this.db.insert(run).values(input).returning();
      return toRun(created);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === '23505') {
        throw new DuplicateIdempotencyKeyError(input.idempotencyKey);
      }
      throw error;
    }
  }

  async update(runId: string, patch: { status?: Run['status']; engineRef?: string }) {
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
  scenarioVersionId: row.scenarioVersionId,
  status: row.status,
  engineRef: row.engineRef,
  createdAt: row.createdAt.toISOString(),
});
