import { createScenarioSchema } from "@/features/scenarios/schema";
import { errorResponse, readJson } from "@/lib/mock/http";
import { getScenarioDetail, MockApiError, updateScenario } from "@/lib/mock/store";

type Context = { params: Promise<{ id: string }> };

/** Mock `GET /api/scenarios/{id}`: returns the scenario with its datasets, or 404. */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;
  try {
    return Response.json(getScenarioDetail(id));
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Mock `PATCH /api/scenarios/{id}`: edits a draft's project, map and name.
 * Responds 200 with the scenario, 400 for an invalid body, 404 for an unknown scenario,
 * project or map, and 409 when the scenario is not a draft or the name is taken on the map.
 */
export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;
  try {
    const parsed = createScenarioSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new MockApiError(400, parsed.error.issues[0].message);
    return Response.json(updateScenario(id, parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
