import { z } from "zod";

/** Scenario lifecycle status, matching the `scenario_status` enum in core-service. */
export const scenarioStatusSchema = z.enum(["draft", "active", "completed"]);

/** One scenario as returned by `GET /scenarios` (list view: no config or dataset URIs). */
export const scenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  mapId: z.string(),
  solutionId: z.string().nullable(),
  status: scenarioStatusSchema,
  authorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Response of `GET /scenarios`. */
export const scenarioListSchema = z.array(scenarioSchema);
