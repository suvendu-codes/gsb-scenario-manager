export const SCENARIO_STATUSES = [
  'draft',
  'ready',
  'running',
  'archived',
] as const;
export type ScenarioStatus = (typeof SCENARIO_STATUSES)[number];

export class Scenario {
  id!: string;
  mapId!: string;
  name!: string;
  status!: ScenarioStatus;
  createdAt!: string;
  updatedAt!: string;

  static create(mapId: string, name: string): Scenario {
    const now = new Date().toISOString();
    return Scenario.restore({
      id: crypto.randomUUID(),
      mapId,
      name,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: {
    id: string;
    mapId: string;
    name: string;
    status: ScenarioStatus;
    createdAt: string;
    updatedAt: string;
  }): Scenario {
    const scenario = new Scenario();
    Object.assign(scenario, props);
    return scenario;
  }

  rename(name: string) {
    this.name = name;
    this.touch();
  }

  touch() {
    this.updatedAt = new Date().toISOString();
  }

  isLocked() {
    return this.status === 'running';
  }
}
