import { errorResponse } from "@/lib/mock/http";
import { getScenarioRun } from "@/lib/mock/run-store";

type Context = { params: Promise<{ id: string }> };

/** Mock `GET /api/scenarios/{id}/run`: the scenario's run, or 404 `run_not_found`. */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;
  try {
    return Response.json(getScenarioRun(id));
  } catch (error) {
    return errorResponse(error);
  }
}
