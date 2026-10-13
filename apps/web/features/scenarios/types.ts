import { z } from "zod";

import {
  createScenarioSchema,
  projectMapSchema,
  projectSchema,
  scenarioSchema,
  scenarioStatusSchema,
} from "./schema";

/** Lifecycle status of a scenario. */
export type ScenarioStatus = z.infer<typeof scenarioStatusSchema>;

/** A scenario as shown in the list. */
export type Scenario = z.infer<typeof scenarioSchema>;

/** Values needed to create a scenario: project, map and name. */
export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;

/** A project that scenarios belong to. */
export type Project = z.infer<typeof projectSchema>;

/** A map within a project. Named `ProjectMap` to avoid clashing with the JavaScript `Map`. */
export type ProjectMap = z.infer<typeof projectMapSchema>;
