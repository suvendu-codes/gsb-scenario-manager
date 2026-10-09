import type { Sort } from '../../../common/dto/sort.dto';
import type { NewScenario, Scenario, ScenarioVersion } from '../../domain/scenario';
import type { ScenarioStatus } from '../../domain/scenario-status';

export const SCENARIO_SORT_FIELDS = ['name', 'created_at', 'updated_at'] as const;
export type ScenarioSortField = (typeof SCENARIO_SORT_FIELDS)[number];

export interface ScenarioListFilter {
  status?: ScenarioStatus;
  sort: Sort<ScenarioSortField>;
}

export interface ScenarioChanges {
  name?: string;
  configUri: string;
  updatedBy: string;
  /** Update only applies if the stored version still matches. */
  expectedVersion: number;
}

export interface ScenarioRepository {
  listByMap(mapId: string, filter: ScenarioListFilter): Promise<Scenario[]>;
  findById(id: string): Promise<Scenario | null>;
  findCurrentVersion(scenario: Scenario): Promise<ScenarioVersion | null>;
  /** @throws DuplicateScenarioNameError when (mapId, name) is taken. */
  create(input: NewScenario): Promise<Scenario>;
  /** Writes a new immutable version. @throws ScenarioVersionConflictError, DuplicateScenarioNameError */
  update(id: string, changes: ScenarioChanges): Promise<Scenario>;
  delete(id: string): Promise<void>;
}

export const SCENARIO_REPOSITORY = Symbol('SCENARIO_REPOSITORY');
