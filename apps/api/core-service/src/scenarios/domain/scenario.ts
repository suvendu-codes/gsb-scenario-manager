import { ScenarioLockedError } from './errors.js';
import { isMutable, ScenarioStatus } from './scenario-status.js';

export interface ScenarioProps {
  id: string;
  projectId: string;
  mapId: string;
  name: string;
  status: ScenarioStatus;
  authorId: string;
  clonedFromScenarioId?: string;
  /** Config revision; starts at 1 and increments on every config update. */
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Everything needed to persist a brand-new scenario (draft). */
export interface NewScenario {
  projectId: string;
  mapId: string;
  name: string;
  authorId: string;
  /** Absent for a fresh draft; the config blob is attached by the first update. */
  configUri?: string;
  /** Inline config stored in the database; used when there is no external blob. */
  config?: Record<string, unknown>;
  createdBy: string;
  clonedFromScenarioId?: string;
}

export class Scenario {
  id!: string;
  projectId!: string;
  mapId!: string;
  name!: string;
  status!: ScenarioStatus;
  authorId!: string;
  clonedFromScenarioId?: string;
  version = 1;
  createdAt!: Date;
  updatedAt!: Date;

  constructor({ version, ...props }: ScenarioProps) {
    Object.assign(this, props);
    if (version) this.version = version;
  }

  canEdit() {
    return isMutable(this.status);
  }

  canDelete() {
    return isMutable(this.status);
  }

  assertEditable() {
    if (!this.canEdit()) throw new ScenarioLockedError(this.id, this.status, 'updated');
  }

  assertDeletable() {
    if (!this.canDelete()) throw new ScenarioLockedError(this.id, this.status, 'deleted');
  }

  /** @param actor Who is cloning; becomes the author of the new scenario. */
  clone(actor: string, configUri: string, name?: string, config?: Record<string, unknown>): NewScenario {
    return {
      projectId: this.projectId,
      mapId: this.mapId,
      name: name ?? `${this.name} (copy)`,
      authorId: actor,
      configUri: configUri || undefined,
      config,
      createdBy: actor,
      clonedFromScenarioId: this.id,
    };
  }
}

export class ScenarioVersion {
  id!: string;
  scenarioId!: string;
  /** Empty when the config lives inline in `config`. */
  configUri!: string;
  config?: Record<string, unknown>;
  createdBy!: string;
  createdAt!: Date;
}
