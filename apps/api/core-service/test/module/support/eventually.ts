import kafkaJs from 'kafkajs';

const { KafkaJSProtocolError } = kafkaJs;

const coordinatorErrors = new Set([14, 15, 16]);
/** Only coordinator discovery/loading errors are safe to retry while observing offsets. */
export function isTransientCoordinatorError(error: unknown): boolean {
  return error instanceof KafkaJSProtocolError && coordinatorErrors.has(error.code);
}

/** Poll within one deadline. Assertions, authorization and unrelated failures still fail immediately. */
export async function eventually(check: () => Promise<boolean>, description: string,
  { timeoutMs = 30_000, intervalMs = 100, retryOnError = () => false }: {
    timeoutMs?: number; intervalMs?: number; retryOnError?: (error: unknown) => boolean;
  } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      if (!retryOnError(error)) throw error;
      // KafkaJS admin offsetFetch can expose a transient coordinator response even
      // while consumption is healthy. Retry the observation, never the test assertion.
      lastError = error;
    }
    const remaining = deadline - Date.now();
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, remaining)));
  }
  throw new Error(`Timed out: ${description}`, { cause: lastError });
}
