import { Logger } from "@nestjs/common";

const logger = new Logger("EventListenerError");

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
