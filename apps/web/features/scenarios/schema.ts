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

/** Maximum length of a scenario name. */
export const SCENARIO_NAME_MAX_LENGTH = 60;

/**
 * Body of `POST /scenarios`. Also validates the create form, so the
 * client and the mock server apply the same rules.
 */
export const createScenarioSchema = z.object({
  projectId: z.string().min(1, "Select a project"),
  mapId: z.string().min(1, "Select a map"),
  name: z
    .string()
    .trim()
    .min(1, "Enter a scenario name")
    .max(SCENARIO_NAME_MAX_LENGTH, `Use ${SCENARIO_NAME_MAX_LENGTH} characters or fewer`),
});

/** One project, as shown in the Project dropdown. */
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

/** Response of `GET /projects`. */
export const projectListSchema = z.array(projectSchema);

/** One map of a project, as shown in the Map dropdown. */
export const projectMapSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string(),
});

/** Response of `GET /projects/{id}/maps`. */
export const projectMapListSchema = z.array(projectMapSchema);
