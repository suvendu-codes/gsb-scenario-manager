/**
 * Base URL of the Scenario Manager API.
 * Defaults to the built-in mock at `/api`; point `NEXT_PUBLIC_API_BASE_URL`
 * at the real core-service to switch over.
 */
export const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
