/** Mock `GET /api/health`: reports that the (mock) service is up. */
export function GET(): Response {
  return Response.json({ status: "ok" });
}
