import { DomainError, type DomainErrorKind } from '../../common/domain/domain-error.js';

/**
 * Trigger API errors with the exact HTTP status and error code from the LLD (§5 Trigger a run).
 * `kind` keeps the global DomainErrorFilter meaningful; RunsErrorFilter uses `status` directly.
 */
export abstract class RunApiError extends DomainError {
  constructor(
    readonly status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    /** Seconds for the Retry-After header, where retrying makes sense. */
    readonly retryAfter?: number,
  ) {
    super(message, kindFor(status), code, details);
  }
}

const kindFor = (status: number): DomainErrorKind =>
  status === 404 ? 'not_found' : status === 409 ? 'conflict' : status === 403 ? 'forbidden' : status >= 500 ? 'unavailable' : 'invalid';

export class IdempotencyKeyRequiredError extends RunApiError {
  constructor(reason = 'The Idempotency-Key header is required') {
    super(400, 'idempotency_key_required', reason);
  }
}

export class IdempotencyKeyReuseError extends RunApiError {
  constructor() {
    super(422, 'idempotency_key_reuse', 'The Idempotency-Key was used before with a different request');
  }
}

export class ScenarioNotTriggerableError extends RunApiError {
  constructor(status: string, activeRun?: string) {
    super(
      409,
      'scenario_not_triggerable',
      activeRun ? 'The scenario has a run in progress' : `The scenario cannot be run while it is ${status}`,
      { status, ...(activeRun ? { active_run: activeRun } : {}) },
    );
  }
}

export class ScenarioBlockedError extends RunApiError {
  constructor(consecutiveFailures: number) {
    super(409, 'scenario_blocked', 'The scenario is blocked after consecutive failed runs', {
      consecutive_failures: consecutiveFailures,
    });
  }
}

export interface ScenarioIssue {
  code:
    | 'config_incomplete'
    | 'config_invalid'
    | 'data_file_missing'
    | 'data_file_changed'
    | 'data_file_map_mismatch'
    | 'map_not_found'
    | 'sizer_not_found';
  message: string;
  file_type?: string;
  path?: string;
}

export class ScenarioInvalidError extends RunApiError {
  constructor(readonly issues: ScenarioIssue[]) {
    super(422, 'scenario_invalid', 'The scenario is not ready to run.', { issues });
  }
}

export class TriggerValidationError extends RunApiError {
  constructor(errors: { path: string; reason: string }[]) {
    super(422, 'validation_failed', 'The request is invalid', { errors });
  }
}

export class EngineUnavailableError extends RunApiError {
  constructor(engine: string) {
    super(503, 'engine_unavailable', `The ${engine} engine is not accepting runs`, { engine }, 300);
  }
}

export class TriggerUpstreamUnavailableError extends RunApiError {
  constructor(what: string) {
    super(503, 'upstream_unavailable', `${what} did not answer`, undefined, 30);
  }
}

export class StorageUnavailableError extends RunApiError {
  constructor(what: string) {
    super(503, 'storage_unavailable', `${what} could not be read or written`, undefined, 30);
  }
}
