import { Scenario } from '../../domain/entities/scenario.entity';

export interface ScenarioRepositoryPort {
  findByMap(mapId: string): Scenario[];
  findById(id: string): Scenario | null;
  save(scenario: Scenario): Scenario;
  delete(id: string): void;
  nameTaken(mapId: string, name: string): boolean;
}

export const SCENARIO_REPOSITORY = Symbol('SCENARIO_REPOSITORY');
