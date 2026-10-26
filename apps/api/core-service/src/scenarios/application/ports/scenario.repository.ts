import type { Sort } from '../../../common/dto/sort.dto.js';
import type { NewScenario, Scenario, ScenarioVersion } from '../../domain/scenario.js';
import type { ScenarioStatus } from '../../domain/scenario-status.js';

export const SCENARIO_SORT_FIELDS = ['name', 'created_at', 'updated_at'] as const;
export type ScenarioSortField = (typeof SCENARIO_SORT_FIELDS)[number];

export interface ScenarioListFilter {
  status?: ScenarioStatus;
  sort: Sort<ScenarioSortField>;
}

export interface ScenarioCursor {
  value: string; // ISO date for created_at/updated_at, raw string for name
  id: string;
}

export interface ScenarioPageFilter {
  status?: ScenarioStatus;
  mapId?: string;
  projectId?: string;
  sort: Sort<ScenarioSortField>;
  /** The repository fetches limit + 1 rows so the caller can detect a next page. */
  limit: number;
  after?: ScenarioCursor;
}

export interface ScenarioChanges {
  name?: string;
  configUri: string;
  updatedBy: string;
}

export interface ScenarioRepository {
  listByMap(mapId: string, filter: ScenarioListFilter): Promise<Scenario[]>;
  list(filter: ScenarioPageFilter): Promise<Scenario[]>;
  findById(id: string): Promise<Scenario | null>;
  findCurrentVersion(scenario: Scenario): Promise<ScenarioVersion | null>;
  /** @throws DuplicateScenarioNameError when (mapId, name) is taken. */
  create(input: NewScenario): Promise<Scenario>;
  /** Writes a new immutable version. @throws DuplicateScenarioNameError */
  update(id: string, changes: ScenarioChanges): Promise<Scenario>;
  delete(id: string): Promise<void>;
}

export const SCENARIO_REPOSITORY = Symbol('SCENARIO_REPOSITORY');
