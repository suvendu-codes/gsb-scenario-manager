import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, type AnyColumn } from 'drizzle-orm';
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
  body?: Record<string, unknown>;
  updatedBy?: string;
  version?: number;
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

  async list({ status, mapId, projectId, sort, page, limit }: ScenarioPageFilter) {
    const column = SORT_COLUMNS[sort.field];
    const order = sort.direction === 'desc' ? desc : asc;

    const where = and(
      status ? eq(scenario.status, status) : undefined,
      mapId ? eq(scenario.mapId, mapId) : undefined,
      projectId ? eq(scenario.projectId, projectId) : undefined,
    );

    const [rows, [totals]] = await Promise.all([
      this.db
        .select()
        .from(scenario)
        .where(where)
        .orderBy(order(column), order(scenario.id))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(scenario).where(where),
    ]);
    return { items: rows.map(toScenario), total: totals?.total ?? 0 };
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(scenario).where(eq(scenario.id, id)).limit(1);
    return row ? toScenario(row) : null;
  }

  async findCurrentVersion(s: Scenario) {
    const [row] = await this.db.select().from(scenario).where(eq(scenario.id, s.id)).limit(1);
    if (!row) return null;
    const cfg = readConfig(row);
    if (!cfg.configUri && !cfg.body) return null;
    return Object.assign(new ScenarioVersion(), {
      id: row.id,
      scenarioId: row.id,
      configUri: cfg.configUri ?? '',
      config: cfg.body,
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
            body: input.config,
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
      // FOR UPDATE serializes concurrent writers on this row, so a patch is always applied to the latest config.
      return await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(scenario)
          .where(eq(scenario.id, id))
          .limit(1)
          .for('update');
        if (!current) throw new ScenarioNotFoundError(id);
        toScenario(current).assertEditable();
        const config = nextStoredConfig(readConfig(current), changes);

        const [updated] = await tx
          .update(scenario)
          .set({
            name: changes.name ?? current.name,
            config,
            updatedAt: new Date(),
          })
          .where(and(eq(scenario.id, id), eq(scenario.status, ScenarioStatus.Draft)))
          .returning();
        if (!updated) throw new ScenarioLockedError(id, current.status, 'updated');
        return toScenario(updated);
      });
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

/**
 * Pointing configUri somewhere new makes that blob the source of truth: the stored inline body and its
 * version are dropped (otherwise the body would keep winning on read), and a patch applies to the new blob.
 */
export function nextStoredConfig(stored: StoredConfig, changes: ScenarioChanges): StoredConfig {
  const repointed = changes.configUri !== undefined && changes.configUri !== stored.configUri;
  const base: StoredConfig = repointed ? { ...stored, body: undefined, version: undefined } : stored;
  const body = changes.patchConfig ? changes.patchConfig(base.body) : changes.config;

  return {
    ...base,
    configUri: changes.configUri ?? stored.configUri,
    ...(body && { body, version: (base.version ?? 1) + 1 }),
    updatedBy: changes.updatedBy,
  };
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
    version: readConfig(row).version,
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
