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
    throw new MockApiError(400, "Request body must be valid JSON.");
  }
}

/**
 * Turns a `MockApiError` into the JSON error response the real API would send
 * (`{ message }` with the right status). Any other error is rethrown.
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof MockApiError) {
    return Response.json({ message: error.message }, { status: error.status });
  }
  throw error;
}
