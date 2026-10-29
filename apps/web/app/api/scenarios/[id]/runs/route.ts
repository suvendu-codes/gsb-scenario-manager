import { errorResponse, readJson } from "@/lib/mock/http";
import { triggerRun } from "@/lib/mock/run-store";

type Context = { params: Promise<{ id: string }> };

/**
 * Mock `POST /api/scenarios/{id}/runs`: triggers the scenario's run, with an optional
 * `{ engine }` body and `Idempotency-Key` header. Responds 202 with the run (200 for a repeated
 * key), 404 for an unknown scenario, 409 `scenario_not_triggerable` when it is not a draft, and
 * 422 `scenario_invalid` listing the issues that stop it from running.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;
  try {
    const text = await request.clone().text();
    const body = text ? await readJson(request) : {};
    const engine =
      body && typeof body === "object" && "engine" in body && typeof body.engine === "string"
        ? body.engine
        : "default";
    const { run, created } = triggerRun(id, request.headers.get("Idempotency-Key"), engine);
    return Response.json(run, { status: created ? 202 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
