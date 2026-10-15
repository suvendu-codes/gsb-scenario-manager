import { DomainError } from '../../common/domain/domain-error';

export class DuplicateCorrelationIdError extends DomainError {
  constructor(correlationId: string) {
    super(`A run with correlation id "${correlationId}" already exists`, 'conflict');
  }
}

export class RunTriggerFailedError extends DomainError {
  constructor(runId: string, reason: string) {
    super(`Run ${runId} could not be started: ${reason}`, 'bad_gateway');
  }
}
