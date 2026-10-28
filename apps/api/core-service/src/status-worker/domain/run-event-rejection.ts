/** Stable, sanitized reasons for rejected input; never carry the raw event. */
export type RunEventRejectionCode =
  | 'empty_event'
  | 'malformed_json'
  | 'invalid_execution_identity'
  | 'invalid_correlation_id'
  | 'invalid_engine_run_id'
  | 'invalid_event_schema'
  | 'unknown_correlation'
  | 'correlation_mismatch'
  | 'engine_mismatch'
  | 'engine_run_id_mismatch';

/** Not a database/network failure and not permission to discard or acknowledge. */
export class RunEventRejectedError extends Error {
  constructor(readonly code: RunEventRejectionCode, message: string) {
    super(message);
    this.name = new.target.name;
  }
}
