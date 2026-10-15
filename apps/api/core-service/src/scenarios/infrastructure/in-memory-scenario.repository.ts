import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  ScenarioChanges,
  ScenarioListFilter,
  ScenarioRepository,
} from '../application/ports/scenario.repository';
import { DuplicateScenarioNameError, ScenarioVersionConflictError } from '../domain/errors';
import { NewScenario, Scenario, ScenarioProps, ScenarioVersion } from '../domain/scenario';
import { ScenarioStatus } from '../domain/scenario-status';

type Row = ScenarioProps & { configUri: string; updatedBy: string };

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

  async findById(id: string) {
    const row = this.rows.find((item) => item.id === id);
    return row ? toScenario(row) : null;
  }

  async findCurrentVersion(scenario: Scenario) {
    const row = this.rows.find((item) => item.id === scenario.id);
    if (!row?.configUri) return null;
    return Object.assign(new ScenarioVersion(), {
      id: row.id,
      scenarioId: row.id,
      versionNumber: row.version,
      configUri: row.configUri,
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
      throw new Error('scenario_one_draft_per_map');
    }
    const now = new Date();
    const row: Row = {
      id: randomUUID(),
      projectId: input.projectId,
      mapId: input.mapId,
      name: input.name,
      status: ScenarioStatus.Draft,
      authorId: input.authorId,
      currentVersion: 1,
      version: 1,
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
    if (!row || row.version !== changes.expectedVersion) {
      throw new ScenarioVersionConflictError(id);
    }
    const name = changes.name ?? row.name;
    if (this.rows.some((item) => item.id !== id && item.mapId === row.mapId && item.name === name)) {
      throw new DuplicateScenarioNameError(row.mapId, name);
    }
    const version = row.version + 1;
    row.name = name;
    row.version = version;
    row.currentVersion = version;
    row.configUri = changes.configUri;
    row.updatedBy = changes.updatedBy;
    row.updatedAt = new Date();
    return toScenario(row);
  }

  async delete(id: string) {
    const index = this.rows.findIndex((row) => row.id === id);
    if (index >= 0) this.rows.splice(index, 1);
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
