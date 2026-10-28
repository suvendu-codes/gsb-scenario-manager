import { errorResponse } from "@/lib/mock/http";
import { getRun } from "@/lib/mock/run-store";

type Context = { params: Promise<{ correlationId: string }> };

/** Mock `GET /api/runs/{correlationId}`: a run by its correlation id, or 404 `run_not_found`. */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { correlationId } = await params;
  try {
    return Response.json(getRun(correlationId));
  } catch (error) {
    return errorResponse(error);
  }
}
