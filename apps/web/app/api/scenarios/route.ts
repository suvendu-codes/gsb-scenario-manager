import { listScenarios } from "@/lib/mock/store";

/** Mock `GET /api/scenarios`: returns the in-memory scenario list. */
export function GET(): Response {
  return Response.json(listScenarios());
}
