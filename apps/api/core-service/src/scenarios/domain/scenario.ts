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
  createdAt: Date;
  updatedAt: Date;
}

/** Everything needed to persist a brand-new scenario (draft). */
export interface NewScenario {
  projectId: string;
  mapId: string;
  name: string;
  authorId: string;
  configUri: string;
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
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: ScenarioProps) {
    Object.assign(this, props);
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

  clone(configUri: string, name?: string): NewScenario {
    return {
      projectId: this.projectId,
      mapId: this.mapId,
      name: name ?? `${this.name} (copy)`,
      authorId: this.authorId,
      configUri,
      createdBy: this.authorId,
      clonedFromScenarioId: this.id,
    };
  }
}

export class ScenarioVersion {
  id!: string;
  scenarioId!: string;
  configUri!: string;
  createdBy!: string;
  createdAt!: Date;
}
