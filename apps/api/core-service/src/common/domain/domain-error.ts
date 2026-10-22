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

export class InvalidCursorError extends DomainError {
  constructor(reason = 'Invalid cursor') {
    super(reason, 'invalid');
  }
}
