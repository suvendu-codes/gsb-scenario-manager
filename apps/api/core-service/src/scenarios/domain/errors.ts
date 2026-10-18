import { DomainError } from '../../common/domain/domain-error.js';

export class ScenarioNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Scenario ${id} not found`, 'not_found');
  }
}

export class ScenarioConfigNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Scenario ${id} has no config version`, 'not_found');
  }
}

export class ScenarioLockedError extends DomainError {
  constructor(id: string, status: string, action: 'updated' | 'deleted') {
    super(`Scenario ${id} cannot be ${action} while status is ${status}`, 'conflict');
  }
}

export class DuplicateScenarioNameError extends DomainError {
  constructor(mapId: string, name: string) {
    super(`Scenario name "${name}" already exists for map ${mapId}`, 'conflict');
  }
}

export class DraftAlreadyExistsError extends DomainError {
  constructor(mapId: string) {
    super(`Map ${mapId} already has a draft scenario`, 'conflict');
  }
}
