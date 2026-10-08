import { Injectable } from '@nestjs/common';
import { ScenarioRepositoryPort } from '../../application/ports/scenario.repository.port';
import {
  Scenario,
  SCENARIO_STATUSES,
} from '../../domain/entities/scenario.entity';
import { int, pastDate, pick } from '../../../common/random';

const NAMES = [
  'Peak load',
  'Night shift',
  'Robot outage',
  'Mixed orders',
  'Dock congestion',
];

@Injectable()
export class InMemoryScenarioRepository implements ScenarioRepositoryPort {
  private readonly byId = new Map<string, Scenario>();
  private readonly seededMaps = new Set<string>();

  findByMap(mapId: string): Scenario[] {
    this.seed(mapId);
    return [...this.byId.values()].filter(
      (scenario) => scenario.mapId === mapId,
    );
  }

  findById(id: string): Scenario | null {
    return this.byId.get(id) ?? null;
  }

  save(scenario: Scenario): Scenario {
    this.byId.set(scenario.id, scenario);
    return scenario;
  }

  delete(id: string): void {
    this.byId.delete(id);
  }

  nameTaken(mapId: string, name: string): boolean {
    this.seed(mapId);
    return [...this.byId.values()].some(
      (scenario) => scenario.mapId === mapId && scenario.name === name,
    );
  }

  private seed(mapId: string) {
    if (this.seededMaps.has(mapId)) return;
    this.seededMaps.add(mapId);
    for (let i = 0; i < int(3, 5); i++) {
      const created = pastDate(60);
      const scenario = Scenario.restore({
        id: crypto.randomUUID(),
        mapId,
        name: NAMES[i],
        status: pick(SCENARIO_STATUSES),
        createdAt: created,
        updatedAt: created,
      });
      this.byId.set(scenario.id, scenario);
    }
  }
}
