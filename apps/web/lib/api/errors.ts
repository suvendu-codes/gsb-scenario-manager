/**
 * What went wrong with a request:
 * - `network`: the request never reached the server
 * - `timeout`: the server took longer than the timeout
 * - `http`: the server answered with a non-2xx status
 * - `invalid-response`: the server answered 2xx but the body was not valid JSON or did not match the schema
 */
export type ApiErrorKind = "network" | "timeout" | "http" | "invalid-response";

/** Error thrown by `request` for every failure, so callers only handle one error type. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status code, or `0` when there was no response (network error or timeout). */
  readonly status: number;

  constructor(kind: ApiErrorKind, status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

/**
 * True when the failure looks like the service itself is having trouble:
 * a network error, a timeout, or a 5xx response. False for 4xx, which are the caller's mistake.
 *
 * @param error - Any thrown value.
 */
export function isServiceFailure(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.kind === "network" || error.kind === "timeout" || error.status >= 500)
  );
}
