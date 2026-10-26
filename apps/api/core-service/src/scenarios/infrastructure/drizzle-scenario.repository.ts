import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, lt, or, type AnyColumn, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants.js';
import type { DrizzleDB } from '../../db/db.module.js';
import { scenario } from '../../db/schema/scenario.js';
import type {
  ScenarioChanges,
  ScenarioListFilter,
  ScenarioPageFilter,
  ScenarioRepository,
  ScenarioSortField,
} from '../application/ports/scenario.repository.js';
import {
  DraftAlreadyExistsError,
  DuplicateScenarioNameError,
  ScenarioLockedError,
  ScenarioNotFoundError,
} from '../domain/errors.js';
import { NewScenario, Scenario, ScenarioVersion } from '../domain/scenario.js';
import { ScenarioStatus } from '../domain/scenario-status.js';

const SORT_COLUMNS: Record<ScenarioSortField, AnyColumn> = {
  name: scenario.name,
  created_at: scenario.createdAt,
  updated_at: scenario.updatedAt,
};

type StoredConfig = {
  configUri?: string;
  updatedBy?: string;
  clonedFromScenarioId?: string;
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

  async list({ status, mapId, projectId, sort, limit, after }: ScenarioPageFilter) {
    const column = SORT_COLUMNS[sort.field];
    const descending = sort.direction === 'desc';
    const beyond = descending ? lt : gt;
    const order = descending ? desc : asc;

    const conditions: (SQL | undefined)[] = [
      status ? eq(scenario.status, status) : undefined,
      mapId ? eq(scenario.mapId, mapId) : undefined,
      projectId ? eq(scenario.projectId, projectId) : undefined,
    ];
    if (after) {
      const value = sort.field === 'name' ? after.value : new Date(after.value);
      conditions.push(
        or(beyond(column, value), and(eq(column, value), beyond(scenario.id, after.id))),
      );
    }

    const rows = await this.db
      .select()
      .from(scenario)
      .where(and(...conditions))
      .orderBy(order(column), order(scenario.id))
      .limit(limit + 1);
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
            updatedBy: input.createdBy,
            clonedFromScenarioId: input.clonedFromScenarioId,
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
      if (!current) throw new ScenarioNotFoundError(id);
      toScenario(current).assertEditable();

      const [updated] = await this.db
        .update(scenario)
        .set({
          name: changes.name ?? current.name,
          config: {
            ...readConfig(current),
            configUri: changes.configUri,
            updatedBy: changes.updatedBy,
          },
          updatedAt: new Date(),
        })
        .where(and(eq(scenario.id, id), eq(scenario.status, ScenarioStatus.Draft)))
        .returning();
      if (!updated) throw new ScenarioLockedError(id, current.status, 'updated');
      return toScenario(updated);
    } catch (error) {
      throw translate(error, undefined, changes.name);
    }
  }

  async delete(id: string) {
    // The status predicate makes the check atomic with the delete, so a concurrent transition out of draft can't slip through.
    const deleted = await this.db
      .delete(scenario)
      .where(and(eq(scenario.id, id), eq(scenario.status, ScenarioStatus.Draft)))
      .returning({ id: scenario.id });
    if (deleted.length > 0) return;

    const [current] = await this.db.select().from(scenario).where(eq(scenario.id, id)).limit(1);
    if (!current) throw new ScenarioNotFoundError(id);
    throw new ScenarioLockedError(id, current.status, 'deleted');
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
  return new Scenario({
    id: row.id,
    projectId: row.projectId,
    mapId: row.mapId,
    name: row.name,
    status: row.status,
    authorId: row.authorId,
    clonedFromScenarioId: readConfig(row).clonedFromScenarioId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
};

/** Maps the unique-violations on (map_id, name) and one-draft-per-map to domain errors; leaves other errors alone. */
function translate(error: unknown, mapId?: string, name?: string): unknown {
  const code = (error as { code?: string } | null)?.code;
  const constraint = (error as { constraint?: string } | null)?.constraint;
  if (code === '23505' && constraint === 'scenario_map_name_unique') {
    return new DuplicateScenarioNameError(mapId ?? 'this map', name ?? '');
  }
  if (code === '23505' && constraint === 'scenario_one_draft_per_map') {
    return new DraftAlreadyExistsError(mapId ?? 'this map');
  }
  return error;
}
