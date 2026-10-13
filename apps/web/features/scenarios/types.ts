import { z } from "zod";

import { scenarioSchema, scenarioStatusSchema } from "./schema";

/** Lifecycle status of a scenario. */
export type ScenarioStatus = z.infer<typeof scenarioStatusSchema>;

/** A scenario as shown in the list. */
export type Scenario = z.infer<typeof scenarioSchema>;
