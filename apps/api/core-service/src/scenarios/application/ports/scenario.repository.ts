import type { Sort } from '../../../common/dto/sort.dto.js';
import type { NewScenario, Scenario, ScenarioVersion } from '../../domain/scenario.js';
import type { ScenarioStatus } from '../../domain/scenario-status.js';

export const SCENARIO_SORT_FIELDS = ['name', 'created_at', 'updated_at'] as const;
export type ScenarioSortField = (typeof SCENARIO_SORT_FIELDS)[number];

export interface ScenarioListFilter {
  status?: ScenarioStatus;
  sort: Sort<ScenarioSortField>;
}

export interface ScenarioPageFilter {
  status?: ScenarioStatus;
  mapId?: string;
  projectId?: string;
  sort: Sort<ScenarioSortField>;
  page: number;
  limit: number;
}

export interface ScenarioChanges {
  name?: string;
  /** Omitted to keep the current blob URI. */
  configUri?: string;
  /** Inline config; replaces the stored body and bumps the version. */
  config?: Record<string, unknown>;
  updatedBy: string;
}

export interface ScenarioRepository {
  listByMap(mapId: string, filter: ScenarioListFilter): Promise<Scenario[]>;
  list(filter: ScenarioPageFilter): Promise<{ items: Scenario[]; total: number }>;
  findById(id: string): Promise<Scenario | null>;
  findCurrentVersion(scenario: Scenario): Promise<ScenarioVersion | null>;
  /** @throws DuplicateScenarioNameError when (mapId, name) is taken. */
  create(input: NewScenario): Promise<Scenario>;
  /** Writes a new immutable version. @throws DuplicateScenarioNameError */
  update(id: string, changes: ScenarioChanges): Promise<Scenario>;
  delete(id: string): Promise<void>;
}

export const SCENARIO_REPOSITORY = Symbol('SCENARIO_REPOSITORY');
