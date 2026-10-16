import { Logger } from "@nestjs/common";

const logger = new Logger("Listener");

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

/** Wraps a listener so a failure is logged and never becomes an unhandled rejection. */
export function safeListener<TArgs extends unknown[]>(
  name: string,
  handler: (...args: TArgs) => unknown | Promise<unknown>,
): (...args: TArgs) => Promise<void> {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (e) {
      const err = toError(e);
      logger.error(`${name} failed: ${err.message}`, err.stack);
    }
  };
}

/** Logs a failure with context and rethrows the ORIGINAL error. */
export async function withSafeListener<T>(
  name: string,
  handler: () => T | Promise<T>,
): Promise<T> {
  try {
    return await handler();
  } catch (e) {
    const err = toError(e);
    logger.error(`${name} failed: ${err.message}`, err.stack);
    throw e;
  }
}
