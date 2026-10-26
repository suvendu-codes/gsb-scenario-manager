import { MockApiError } from "./store";

/**
 * Reads a request's JSON body.
 *
 * @throws {MockApiError} 400 if the body is not valid JSON.
 */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new MockApiError(400, "Request body must be valid JSON.", { code: "INVALID_JSON" });
  }
}

/** The code an error gets when it names none: a stable word for its status. */
function defaultCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return `HTTP_${status}`;
  }
}

/**
 * Turns a `MockApiError` into the JSON error response the real API would send: the error
 * envelope (`code`, `message`, and `params`, `path` and `problems` when there are any) with the
 * right status. Any other error is rethrown.
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof MockApiError) {
    const { code, params, path, problems } = error.details;
    return Response.json(
      {
        code: code ?? defaultCode(error.status),
        message: error.message,
        ...(params && { params }),
        ...(path && { path }),
        ...(problems && { problems }),
      },
      { status: error.status },
    );
  }
  throw error;
}
