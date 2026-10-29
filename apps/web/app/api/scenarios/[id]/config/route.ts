import { configProblem } from "@/features/scenario-config/problems";
import { patchConfigSchema } from "@/features/scenario-config/schema";
import { getScenarioConfig, patchScenarioConfig } from "@/lib/mock/config-store";
import { summarizeProblems } from "@/lib/api/error";
import { errorResponse, readJson } from "@/lib/mock/http";
import { MockApiError } from "@/lib/mock/store";

type Context = { params: Promise<{ id: string }> };

/**
 * Mock `GET /api/scenarios/{id}/config`: returns the scenario's default config, its overrides
 * (changes by dot-notation path; empty means defaults) and the problems that would stop a run,
 * or 404 for an unknown scenario.
 */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;
  try {
    return Response.json(getScenarioConfig(id));
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Mock `PATCH /api/scenarios/{id}/config`: changes a draft's config with `{ set, reset }`.
 * Responds 200 with the updated config, 400 listing every problem (an invalid body, an unknown
 * path or a value that makes the config invalid), 404 for an unknown scenario and 409 when it
 * is not a draft.
 */
export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;
  try {
    const parsed = patchConfigSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      const problems = parsed.error.issues.map((issue) =>
        configProblem("INVALID_BODY", { reason: issue.message }, issue.path.join(".")),
      );
      throw new MockApiError(400, summarizeProblems(problems), { code: "INVALID_BODY", problems });
    }
    return Response.json(patchScenarioConfig(id, parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
