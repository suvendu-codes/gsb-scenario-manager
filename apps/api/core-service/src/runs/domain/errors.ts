import { DomainError } from '../../common/domain/domain-error';

export class DuplicateIdempotencyKeyError extends DomainError {
  constructor(key: string) {
    super(`A run with idempotency key "${key}" already exists`, 'conflict');
  }
}

export class RunTriggerFailedError extends DomainError {
  constructor(runId: string, reason: string) {
    super(`Run ${runId} could not be started: ${reason}`, 'bad_gateway');
  }
}
