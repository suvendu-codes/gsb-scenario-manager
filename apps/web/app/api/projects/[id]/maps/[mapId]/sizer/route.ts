import { errorResponse } from "@/lib/mock/http";
import { mapLookupBody } from "@/lib/mock/map-lookups";

type Context = { params: Promise<{ id: string; mapId: string }> };

/**
 * Mock `GET /api/projects/{id}/maps/{mapId}/sizer`: the map's bot types and counts, as the sizer gives them, from the fixture files in
 * `lib/mock/data`, or 404 `project_not_found` / `map_not_found`. An optional `map_version`
 * query is echoed back.
 */
export async function GET(request: Request, { params }: Context): Promise<Response> {
  const { id, mapId } = await params;
  try {
    const mapVersion = new URL(request.url).searchParams.get("map_version");
    return Response.json(mapLookupBody("sizer", id, mapId, mapVersion));
  } catch (error) {
    return errorResponse(error);
  }
}
