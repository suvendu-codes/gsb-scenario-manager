import { DomainError } from '../../common/domain/domain-error.js';

export class ScenarioNotFoundError extends DomainError {
  constructor(id: string) {
    super('No scenario with this id', 'not_found', 'scenario_not_found');
    void id;
  }
}

export class ScenarioConfigNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Scenario ${id} has no config version`, 'not_found');
  }
}

export class ScenarioLockedError extends DomainError {
  constructor(id: string, status: string, action: 'updated' | 'deleted') {
    super(
      action === 'updated'
        ? "The status isn't draft. Clone the scenario to change it"
        : `Scenario ${id} cannot be deleted while status is ${status}`,
      'conflict',
      'scenario_not_editable',
      { status },
    );
  }
}

export class DuplicateScenarioNameError extends DomainError {
  constructor(mapId: string, name: string) {
    super('The new name is already used for this project and map', 'conflict', 'scenario_already_exists');
    void mapId;
    void name;
  }
}

export class DraftAlreadyExistsError extends DomainError {
  constructor(mapId: string) {
    super(`Map ${mapId} already has a draft scenario`, 'conflict');
  }
}

export class ScenarioConfigUnreadableError extends DomainError {
  constructor(uri: string, reason: string) {
    super(`Scenario config at ${uri} could not be read: ${reason}`, 'bad_gateway');
  }
}
