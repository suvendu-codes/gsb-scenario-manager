import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, type AnyColumn } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.module';
import { scenario } from '../../db/schema/scenario';
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

type StoredConfig = {
  configUri?: string;
  version?: number;
  updatedBy?: string;
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
    const [row] = await this.db.select().from(scenario).where(eq(scenario.id, s.id)).limit(1);
    if (!row) return null;
    const cfg = readConfig(row);
    if (!cfg.configUri) return null;
    return Object.assign(new ScenarioVersion(), {
      id: row.id,
      scenarioId: row.id,
      versionNumber: cfg.version ?? 1,
      configUri: cfg.configUri,
      createdBy: cfg.updatedBy ?? row.authorId,
      createdAt: row.updatedAt,
    });
  }

  async create(input: NewScenario) {
    try {
      const [created] = await this.db
        .insert(scenario)
        .values({
          projectId: input.projectId,
          mapId: input.mapId,
          name: input.name,
          authorId: input.authorId,
          config: {
            configUri: input.configUri,
            version: 1,
            updatedBy: input.createdBy,
          },
        })
        .returning();
      return toScenario(created);
    } catch (error) {
      throw translate(error, input.mapId, input.name);
    }
  }

  async update(id: string, changes: ScenarioChanges) {
    try {
      const [current] = await this.db.select().from(scenario).where(eq(scenario.id, id)).limit(1);
      if (!current) throw new ScenarioVersionConflictError(id);

      const cfg = readConfig(current);
      const version = cfg.version ?? 1;
      if (version !== changes.expectedVersion) throw new ScenarioVersionConflictError(id);

      const [updated] = await this.db
        .update(scenario)
        .set({
          name: changes.name ?? current.name,
          config: {
            configUri: changes.configUri,
            version: version + 1,
            updatedBy: changes.updatedBy,
          },
          updatedAt: new Date(),
        })
        .where(eq(scenario.id, id))
        .returning();
      if (!updated) throw new ScenarioVersionConflictError(id);
      return toScenario(updated);
    } catch (error) {
      throw translate(error, undefined, changes.name);
    }
  }

  async delete(id: string) {
    await this.db.delete(scenario).where(eq(scenario.id, id));
  }
}

const readConfig = (row: typeof scenario.$inferSelect): StoredConfig => {
  const config = row.config;
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    return config as StoredConfig;
  }
  return {};
};

const toScenario = (row: typeof scenario.$inferSelect) => {
  const version = readConfig(row).version ?? 1;
  return new Scenario({
    id: row.id,
    projectId: row.projectId,
    mapId: row.mapId,
    name: row.name,
    status: row.status,
    authorId: row.authorId,
    currentVersion: version,
    version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
};

/** Maps the unique-violation on (map_id, name) to a domain error; leaves other errors alone. */
function translate(error: unknown, mapId?: string, name?: string): unknown {
  const code = (error as { code?: string } | null)?.code;
  const constraint = (error as { constraint?: string } | null)?.constraint;
  if (code === '23505' && constraint === 'scenario_map_name_unique') {
    return new DuplicateScenarioNameError(mapId ?? 'this map', name ?? '');
  }
  return error;
}
