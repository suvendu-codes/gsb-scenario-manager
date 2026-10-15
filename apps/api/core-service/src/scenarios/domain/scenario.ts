import {
  ScenarioLockedError,
  ScenarioVersionConflictError,
} from './errors';
import { isMutable, ScenarioStatus } from './scenario-status';

export interface ScenarioProps {
  id: string;
  projectId: string;
  mapId: string;
  name: string;
  status: ScenarioStatus;
  authorId: string;
  currentVersion: number;
  /** Optimistic-lock counter, bumped on every update. */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Everything needed to persist a brand-new scenario (draft, version 1). */
export interface NewScenario {
  projectId: string;
  mapId: string;
  name: string;
  authorId: string;
  configUri: string;
  createdBy: string;
}

export class Scenario {
  id!: string;
  projectId!: string;
  mapId!: string;
  name!: string;
  status!: ScenarioStatus;
  authorId!: string;
  currentVersion!: number;
  version!: number;
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

  assertVersion(expected: number) {
    if (this.version !== expected) throw new ScenarioVersionConflictError(this.id);
  }

  duplicate(configUri: string, createdBy: string): NewScenario {
    return {
      projectId: this.projectId,
      mapId: this.mapId,
      name: `${this.name} (copy)`,
      authorId: this.authorId,
      configUri,
      createdBy,
    };
  }
}

export class ScenarioVersion {
  id!: string;
  scenarioId!: string;
  versionNumber!: number;
  configUri!: string;
  createdBy!: string;
  createdAt!: Date;
}
