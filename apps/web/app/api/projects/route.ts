import { listProjects } from "@/lib/mock/store";

/** Mock `GET /api/projects`: returns all projects. */
export function GET(): Response {
  return Response.json(listProjects());
}
