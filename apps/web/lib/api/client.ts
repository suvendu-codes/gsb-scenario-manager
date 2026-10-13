import { z } from "zod";

import { API_BASE_URL } from "@/lib/env";

/** Error thrown by `request` for network failures, non-2xx responses and invalid payloads. */
export class ApiError extends Error {
  /** HTTP status code, or `0` when the request never reached the server. */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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

/**
 * Calls the Scenario Manager API and validates the JSON response.
 *
 * @param path - Path under the API base URL, starting with `/` (for example `/scenarios`).
 * @param schema - Zod schema the response body must match.
 * @param init - Optional `fetch` options (method, body, headers).
 * @returns The parsed response body, typed from `schema`.
 * @throws {ApiError} On network failure, a non-2xx status, or a response that does not match `schema`.
 */
export async function request<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  init?: RequestInit,
): Promise<z.infer<S>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiError(response.status, "The server returned an unexpected response.");
  }
  return parsed.data;
}
