import { DomainError } from '../../common/domain/domain-error.js';

export class ScenarioNotTriggerableError extends DomainError {
  constructor(id: string, status: string) {
    super(`Scenario ${id} cannot be triggered while status is ${status}`, 'conflict');
  }
}

export class ActiveRunExistsError extends DomainError {
  constructor(scenarioId: string, runId?: string, status?: string) {
    super(
      runId
        ? `Scenario ${scenarioId} already has an active run ${runId} (${status})`
        : `Scenario ${scenarioId} already has an active run`,
      'conflict',
    );
  }
}

export class IdempotencyKeyReusedError extends DomainError {
  constructor(key: string) {
    super(`Idempotency-Key "${key}" was already used with a different trigger request`, 'conflict');
  }
}

export class InvalidExecutionInputError extends DomainError {
  constructor(message: string) {
    super(message, 'invalid');
  }
}
