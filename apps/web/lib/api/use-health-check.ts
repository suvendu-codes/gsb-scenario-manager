"use client";

import { useQuery } from "@tanstack/react-query";

import { checkHealth } from "./health";

/**
 * Checks the service's health, but only when asked to. Use it after a request failed
 * in a way that might mean the service is down, to tell an outage from an ordinary error.
 *
 * @param enabled - Run the check only when true (for example after a network error or 5xx).
 * @param failureKey - Changes on every new failure (for example the failure's timestamp),
 *   so each failure gets a fresh check instead of reusing an old answer.
 * @returns `isChecking` while the check runs, and `isDown` once it has failed.
 */
export function useHealthCheck(
  enabled: boolean,
  failureKey: number,
): { isChecking: boolean; isDown: boolean } {
  const { data, isPending } = useQuery({
    queryKey: ["health", failureKey],
    queryFn: checkHealth,
    enabled,
    gcTime: 0,
  });

  return { isChecking: enabled && isPending, isDown: enabled && data === false };
}
