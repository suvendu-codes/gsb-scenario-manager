import type { Problem, ProblemParams } from "./error";

/**
 * What went wrong with a request:
 * - `network`: the request never reached the server
 * - `timeout`: the server took longer than the timeout
 * - `http`: the server answered with a non-2xx status
 * - `invalid-response`: the server answered 2xx but the body was not valid JSON or did not match the schema
 */
export type ApiErrorKind = "network" | "timeout" | "http" | "invalid-response";

/** What an error response can add to its message: the fields of the API's error envelope. */
export type ApiErrorDetails = {
  code?: string;
  params?: ProblemParams;
  path?: string;
  problems?: Problem[];
  /** The server's id for the request, for tracing. */
  requestId?: string;
};

/** Error thrown by `request` for every failure, so callers only handle one error type. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status code, or `0` when there was no response (network error or timeout). */
  readonly status: number;
  /** The stable, machine-readable code the server sent, if its error body had one. */
  readonly code?: string;
  /** The values the server built its message from, if it sent them. */
  readonly params?: ProblemParams;
  /** Where the problem is, as a dot-notation path, if the server named one. */
  readonly path?: string;
  /** Every problem the server found, when it listed them; empty otherwise. */
  readonly problems: Problem[];
  /** The server's id for the request (`request_id` or the `X-Request-Id` header), if sent. */
  readonly requestId?: string;

  constructor(kind: ApiErrorKind, status: number, message: string, details: ApiErrorDetails = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = details.code;
    this.params = details.params;
    this.path = details.path;
    this.problems = details.problems ?? [];
    this.requestId = details.requestId;
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
