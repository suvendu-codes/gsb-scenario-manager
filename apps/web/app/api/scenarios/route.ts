import { createScenarioSchema } from "@/features/scenarios/schema";
import { createScenario, listScenarios, MockApiError } from "@/lib/mock/store";

/** Mock `GET /api/scenarios`: returns the in-memory scenario list. */
export function GET(): Response {
  return Response.json(listScenarios());
}

/**
 * Mock `POST /api/scenarios`: creates a draft scenario.
 * Responds 201 with the scenario, 400 for an invalid body, 404 for an unknown
 * project or map, and 409 when the name is already used on the map.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = createScenarioSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    return Response.json(createScenario(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof MockApiError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
