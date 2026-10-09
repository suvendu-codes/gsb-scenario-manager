// import { Logger } from "@nestjs/common";

// const logger = new Logger("EventListenerError");

// function logListenerFailure(listenerName: string, error: unknown): Error {
//   const err = error instanceof Error ? error : new Error(String(error));
//   logger.error(`${listenerName} failed: ${err.message}`, err.stack);
//   return err;
// }

// /** Runs a handler, logs failures, and rethrows (for HTTP handlers). */
// export async function withSafeListener<T>(
//   listenerName: string,
//   handler: () => T | Promise<T>,
// ): Promise<T> {
//   try {
//     return await handler();
//   } catch (error) {
//     throw logListenerFailure(listenerName, error);
//   }
// }

// export function safeListener<TArgs extends unknown[]>(
//   listenerName: string,
//   handler: (...args: TArgs) => unknown | Promise<unknown>,
// ): (...args: TArgs) => Promise<void> {
//   return async (...args: TArgs) => {
//     try {
//       await handler(...args);
//     } catch (error) {
//       logListenerFailure(listenerName, error);
//     }
//   };
// }

import { Logger } from "@nestjs/common";

const logger = new Logger("ErrorListener");

export function safeListener<TArgs extends unknown[]>(
  listenerName: string,
  handler: (...args: TArgs) => unknown | Promise<unknown>,
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs) => {
    try {
      await handler(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`${listenerName} failed: ${err.message}`, err.stack);

    
    }
  };
}

/** Runs a handler, logs failures, and rethrows (for HTTP handlers). */
export async function withSafeListener<T>(
  listenerName: string,
  handler: () => T | Promise<T>,
): Promise<T> {
  try {
    return await handler();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`${listenerName} failed: ${err.message}`, err.stack);
    throw err;
  }
}
