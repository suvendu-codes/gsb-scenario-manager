import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql, type AnyColumn } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.module';
import { scenario } from '../../db/schema/scenario';
import { scenarioVersion } from '../../db/schema/scenario-version';
import type {
  ScenarioChanges,
  ScenarioListFilter,
  ScenarioRepository,
  ScenarioSortField,
} from '../application/ports/scenario.repository';
import { DuplicateScenarioNameError, ScenarioVersionConflictError } from '../domain/errors';
import { NewScenario, Scenario, ScenarioVersion } from '../domain/scenario';

const SORT_COLUMNS: Record<ScenarioSortField, AnyColumn> = {
  name: scenario.name,
  created_at: scenario.createdAt,
  updated_at: scenario.updatedAt,
};

@Injectable()
export class DrizzleScenarioRepository implements ScenarioRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listByMap(mapId: string, { status, sort }: ScenarioListFilter) {
    const column = SORT_COLUMNS[sort.field];
    const rows = await this.db
      .select()
      .from(scenario)
      .where(
        status
          ? and(eq(scenario.mapId, mapId), eq(scenario.status, status))
          : eq(scenario.mapId, mapId),
      )
      .orderBy(sort.direction === 'desc' ? desc(column) : asc(column));
    return rows.map(toScenario);
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(scenario).where(eq(scenario.id, id)).limit(1);
    return row ? toScenario(row) : null;
  }

  async findCurrentVersion(s: Scenario) {
    const [row] = await this.db
      .select()
      .from(scenarioVersion)
      .where(
        and(
          eq(scenarioVersion.scenarioId, s.id),
          eq(scenarioVersion.versionNumber, s.currentVersion),
        ),
      )
      .limit(1);
    return row ? Object.assign(new ScenarioVersion(), row) : null;
  }

  async create(input: NewScenario) {
    try {
      return await this.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(scenario)
          .values({
            projectId: input.projectId,
            mapId: input.mapId,
            name: input.name,
            authorId: input.authorId,
          })
          .returning();
        await tx.insert(scenarioVersion).values({
          scenarioId: created.id,
          versionNumber: created.currentVersion,
          configUri: input.configUri,
          createdBy: input.createdBy,
        });
        return toScenario(created);
      });
    } catch (error) {
      throw translate(error, input.mapId, input.name);
    }
  }

  async update(id: string, changes: ScenarioChanges) {
    try {
      return await this.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(scenario)
          .set({
            name: changes.name,
            currentVersion: sql`${scenario.currentVersion} + 1`,
            version: sql`${scenario.version} + 1`,
            updatedAt: new Date(),
          })
          .where(and(eq(scenario.id, id), eq(scenario.version, changes.expectedVersion)))
          .returning();
        if (!updated) throw new ScenarioVersionConflictError(id);

        await tx.insert(scenarioVersion).values({
          scenarioId: id,
          versionNumber: updated.currentVersion,
          configUri: changes.configUri,
          createdBy: changes.updatedBy,
        });
        return toScenario(updated);
      });
    } catch (error) {
      throw translate(error, undefined, changes.name);
    }
  }

  async delete(id: string) {
    await this.db.delete(scenario).where(eq(scenario.id, id));
  }
}

const toScenario = (row: typeof scenario.$inferSelect) => new Scenario(row);

/** Maps the unique-violation on (map_id, name) to a domain error; leaves other errors alone. */
function translate(error: unknown, mapId?: string, name?: string): unknown {
  const code = (error as { code?: string } | null)?.code;
  const constraint = (error as { constraint?: string } | null)?.constraint;
  if (code === '23505' && constraint === 'scenario_map_name_unique') {
    return new DuplicateScenarioNameError(mapId ?? 'this map', name ?? '');
  }
  return error;
}
