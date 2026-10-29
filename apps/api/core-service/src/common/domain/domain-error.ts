export type DomainErrorKind =
  | 'invalid'
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'unavailable'
  | 'bad_gateway';

/** Base for errors the domain/application layers raise; the HTTP filter maps `kind` to a status. */
export abstract class DomainError extends Error {
  constructor(
    message: string,
    readonly kind: DomainErrorKind,
    /** Machine-readable code (e.g. `project_not_found`) echoed in the response body. */
    readonly code?: string,
    /** Extra fields the client needs to act on the error (e.g. the blocking status). */
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UpstreamUnavailableError extends DomainError {
  constructor(what: string, status: number) {
    super(`${what} unavailable (${status})`, 'unavailable');
  }
}
