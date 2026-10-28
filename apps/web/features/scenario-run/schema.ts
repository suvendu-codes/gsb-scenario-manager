import { z } from "zod";

/** Where a run stands. Unknown states from the server read as `running`. */
export const RUN_STATUSES = ["queued", "accepted", "running", "completed", "failed"] as const;

/**
 * A scenario's run, as the client reads it. Fields it does not use are dropped, so the server
 * can add more without breaking it.
 */
export const runSchema = z.object({
  correlationId: z.string(),
  scenarioId: z.string(),
  status: z.enum(RUN_STATUSES).catch("running"),
  runId: z.string().nullable().optional(),
  attempt: z.number().optional(),
  updatedAt: z.string().optional(),
});

export type Run = z.infer<typeof runSchema>;
export type RunStatus = Run["status"];

/** True once a run has ended and will not change again. */
export const isFinished = (status: RunStatus): boolean =>
  status === "completed" || status === "failed";
