import { listProjectMaps } from "@/lib/mock/store";

/** Mock `GET /api/projects/{id}/maps`: returns the maps of one project. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return Response.json(listProjectMaps(id));
}
