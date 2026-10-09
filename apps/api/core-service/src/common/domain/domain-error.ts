export type DomainErrorKind =
  | 'not_found'
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
