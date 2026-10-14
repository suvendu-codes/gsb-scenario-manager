import { z } from "zod";

import { request } from "./client";

/** Path of the service's health endpoint, under the API base URL. */
export const HEALTH_PATH = "/health";

const healthSchema = z.object({ status: z.string() });

/** A health check should answer fast; a slow answer counts as down. */
const HEALTH_TIMEOUT_MS = 5_000;

/**
 * Asks the service whether it is up (`GET /health`). Never retried and never throws.
 *
 * @returns `true` if the service answered, `false` if the check failed for any reason.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    await request(HEALTH_PATH, healthSchema, {
      timeoutMs: HEALTH_TIMEOUT_MS,
      retry: { retries: 0 },
    });
    return true;
  } catch {
    return false;
  }
}
