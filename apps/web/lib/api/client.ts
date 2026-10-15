import { z } from "zod";

import { API_BASE_URL } from "@/lib/env";

import { ApiError } from "./errors";
import { errorInterceptors, requestInterceptors } from "./interceptors";
import { getRetryPlan, sleep, type RetryOptions } from "./retry-policy";
import { DEFAULT_TIMEOUT_MS, fetchWithTimeout } from "./timeout";

/** Options for `request`: normal `fetch` options plus a timeout and retry override. */
export type RequestOptions = RequestInit & {
  /** Cancel the request after this many milliseconds. Defaults to 10 seconds. */
  timeoutMs?: number;
  /** Overrides the retry rule for this call. */
  retry?: RetryOptions;
};

/** Reads `{ message }` from an error response body, falling back to the status text. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const parsed = z.object({ message: z.string() }).safeParse(body);
    if (parsed.success) return parsed.data.message;
  } catch {
    // Body was empty or not JSON; use the status text below.
  }
  return response.statusText || `Request failed with status ${response.status}`;
}

/** One attempt: interceptors, fetch with timeout, error mapping and validation. */
async function send<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  init: RequestInit,
  method: string,
  timeoutMs: number,
): Promise<z.infer<S>> {
  const context = { method, path, headers: new Headers(init.headers) };
  for (const interceptor of requestInterceptors) await interceptor(context);

  const fail = async (error: ApiError): Promise<never> => {
    for (const interceptor of errorInterceptors) await interceptor(error, { method, path });
    throw error;
  };

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      { ...init, method, headers: context.headers },
      timeoutMs,
    );
  } catch (error) {
    if (error instanceof ApiError) return fail(error);
    throw error;
  }

  if (!response.ok) {
    return fail(new ApiError("http", response.status, await readErrorMessage(response)));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fail(
      new ApiError(
        "invalid-response",
        response.status,
        "The server returned an unexpected response.",
      ),
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(
      new ApiError(
        "invalid-response",
        response.status,
        "The server returned an unexpected response.",
      ),
    );
  }
  return parsed.data;
}

/**
 * Calls the Scenario Manager API and validates the JSON response.
 *
 * Every request runs the request interceptors (for example the auth header) and
 * has a timeout. Failures run the error interceptors (for example the 401 handler).
 * Reads that fail with a network error, a timeout or a 5xx are retried following the
 * retry rules in `retry-policy.ts`; writes are never retried unless a rule says so.
 *
 * @param path - Path under the API base URL, starting with `/` (for example `/scenarios`).
 * @param schema - Zod schema the response body must match.
 * @param options - `fetch` options, plus `timeoutMs` and `retry` for this call.
 * @returns The parsed response body, typed from `schema`.
 * @throws {ApiError} On any failure: network, timeout, non-2xx status, or an invalid response.
 */
export async function request<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.infer<S>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retry, ...init } = options;
  const method = (init.method ?? "GET").toUpperCase();
  const plan = getRetryPlan(method, path, retry);

  for (let attempt = 0; ; attempt++) {
    try {
      return await send(path, schema, init, method, timeoutMs);
    } catch (error) {
      const canRetry =
        error instanceof ApiError && attempt < plan.retries && plan.shouldRetry(error);
      if (!canRetry) throw error;
      await sleep(plan.delayMs(attempt + 1));
    }
  }
}
