import { Logger } from "@nestjs/common";

const logger = new Logger("Listener");

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

// `shared` can't import the app's DomainError, so expected errors are recognised by shape:
// a `kind` that maps to a client error. Upstream outages ('unavailable', 'bad_gateway') are not expected.
const SERVER_SIDE_KINDS = new Set(["unavailable", "bad_gateway"]);

const isExpected = (e: unknown) => {
  const kind = (e as { kind?: unknown } | null)?.kind;
  return typeof kind === "string" && !SERVER_SIDE_KINDS.has(kind);
};

const logFailure = (name: string, e: unknown) => {
  const err = toError(e);
  if (isExpected(e)) logger.warn(`${name} rejected: ${err.message}`);
  else logger.error(`${name} failed: ${err.message}`, err.stack);
};

/** Wraps a listener so a failure is logged and never becomes an unhandled rejection. */
export function safeListener<TArgs extends unknown[]>(
  name: string,
  handler: (...args: TArgs) => unknown | Promise<unknown>,
): (...args: TArgs) => Promise<void> {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (e) {
      logFailure(name, e);
    }
  };
}

/** Logs a failure with context and rethrows the ORIGINAL error. Expected domain errors log at warn. */
export async function withSafeListener<T>(
  name: string,
  handler: () => T | Promise<T>,
): Promise<T> {
  try {
    return await handler();
  } catch (e) {
    logFailure(name, e);
    throw e;
  }
}
