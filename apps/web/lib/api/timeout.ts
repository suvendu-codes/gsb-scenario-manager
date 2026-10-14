import { ApiError } from "./errors";

/** How long a request may take before it is cancelled, unless the call asks for more or less. */
export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * `fetch` with a timeout. Failures become `ApiError`s: `timeout` when the time
 * ran out, `network` for anything else that stopped the request reaching the server.
 * If the caller cancels with its own `signal`, the abort error is rethrown unchanged.
 *
 * @param url - Full URL to request.
 * @param init - Normal `fetch` options.
 * @param timeoutMs - Cancel the request after this many milliseconds.
 * @throws {ApiError} With kind `timeout` or `network`.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new ApiError("timeout", 0, "The request took too long. Please try again.");
    }
    if (init.signal?.aborted) throw error;
    throw new ApiError(
      "network",
      0,
      "Could not reach the server. Check your connection and try again.",
    );
  }
}
