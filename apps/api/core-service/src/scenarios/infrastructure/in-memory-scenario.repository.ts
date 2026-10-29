import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  ScenarioChanges,
  ScenarioListFilter,
  ScenarioPageFilter,
  ScenarioRepository,
} from '../application/ports/scenario.repository.js';
import {
  DraftAlreadyExistsError,
  DuplicateScenarioNameError,
  ScenarioNotFoundError,
} from '../domain/errors.js';
import { NewScenario, Scenario, ScenarioProps, ScenarioVersion } from '../domain/scenario.js';
import { ScenarioStatus } from '../domain/scenario-status.js';
import { nextStoredConfig } from './drizzle-scenario.repository.js';

type Row = ScenarioProps & {
  configUri?: string;
  body?: Record<string, unknown>;
  version?: number;
  updatedBy: string;
};

@Injectable()
export class InMemoryScenarioRepository implements ScenarioRepository {
  private readonly rows: Row[] = [];

  async listByMap(mapId: string, { status, sort }: ScenarioListFilter) {
    return this.rows
      .filter((row) => row.mapId === mapId && (!status || row.status === status))
      .sort((a, b) => {
        const av = sortValue(a, sort.field);
        const bv = sortValue(b, sort.field);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.direction === 'desc' ? -cmp : cmp;
      })
      .map(toScenario);
  }

  async list({ status, mapId, projectId, sort, page, limit }: ScenarioPageFilter) {
    const dir = sort.direction === 'desc' ? -1 : 1;
    const sorted = this.rows
      .filter(
        (row) =>
          (!status || row.status === status) &&
          (!mapId || row.mapId === mapId) &&
          (!projectId || row.projectId === projectId),
      )
      .sort((a, b) => {
        const av = sortValue(a, sort.field);
        const bv = sortValue(b, sort.field);
        const cmp = av < bv ? -1 : av > bv ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        return cmp * dir;
      });
    return {
      items: sorted.slice((page - 1) * limit, page * limit).map(toScenario),
      total: sorted.length,
    };
  }

  async findById(id: string) {
    const row = this.rows.find((item) => item.id === id);
    return row ? toScenario(row) : null;
  }

  async findCurrentVersion(scenario: Scenario) {
    const row = this.rows.find((item) => item.id === scenario.id);
    if (!row?.configUri && !row?.body) return null;
    return Object.assign(new ScenarioVersion(), {
      id: row.id,
      scenarioId: row.id,
      configUri: row.configUri ?? '',
      config: row.body,
      createdBy: row.updatedBy,
      createdAt: row.updatedAt,
    });
  }

  async create(input: NewScenario) {
    if (this.rows.some((row) => row.mapId === input.mapId && row.name === input.name)) {
      throw new DuplicateScenarioNameError(input.mapId, input.name);
    }
    if (
      this.rows.some(
        (row) =>
          row.projectId === input.projectId &&
          row.mapId === input.mapId &&
          row.status === ScenarioStatus.Draft,
      )
    ) {
      throw new DraftAlreadyExistsError(input.mapId);
    }
    const now = new Date();
    const row: Row = {
      id: randomUUID(),
      projectId: input.projectId,
      mapId: input.mapId,
      name: input.name,
      status: ScenarioStatus.Draft,
      authorId: input.authorId,
      clonedFromScenarioId: input.clonedFromScenarioId,
      createdAt: now,
      updatedAt: now,
      configUri: input.configUri,
      updatedBy: input.createdBy,
    };
    this.rows.push(row);
    return toScenario(row);
  }

  async update(id: string, changes: ScenarioChanges) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new ScenarioNotFoundError(id);
    toScenario(row).assertEditable();
    const name = changes.name ?? row.name;
    if (this.rows.some((item) => item.id !== id && item.mapId === row.mapId && item.name === name)) {
      throw new DuplicateScenarioNameError(row.mapId, name);
    }
    row.name = name;
    const next = nextStoredConfig(
      { configUri: row.configUri, body: row.body, version: row.version, updatedBy: row.updatedBy },
      changes,
    );
    row.configUri = next.configUri;
    row.body = next.body;
    row.version = next.version;
    row.updatedBy = changes.updatedBy;
    row.updatedAt = new Date();
    return toScenario(row);
  }

  async delete(id: string) {
    const index = this.rows.findIndex((row) => row.id === id);
    if (index < 0) return;
    toScenario(this.rows[index]).assertDeletable();
    this.rows.splice(index, 1);
  }
}

function sortValue(row: Row, field: ScenarioListFilter['sort']['field']) {
  if (field === 'name') return row.name;
  if (field === 'created_at') return row.createdAt.getTime();
  return row.updatedAt.getTime();
}

function toScenario(row: Row) {
  return new Scenario(row);
}
