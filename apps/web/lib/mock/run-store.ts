import { summarizeProblems } from "@/lib/api/error";

import { getScenarioConfig } from "./config-store";
import { getScenarioDetail, markScenarioActive, MockApiError } from "./store";

/** Where a run stands. The mock moves through these over time; it never fails on its own. */
export type RunStatus = "queued" | "accepted" | "running" | "completed" | "failed";

/** A run as the mock API returns it. */
export type MockRun = {
  correlationId: string;
  scenarioId: string;
  status: RunStatus;
  /** The engine's id for the run; null until the engine accepts it. */
  runId: string | null;
  attempt: number;
  engine: string;
  createdAt: string;
  updatedAt: string;
};

type RunRecord = {
  correlationId: string;
  scenarioId: string;
  idempotencyKey: string | null;
  engine: string;
  startedAt: number;
};

/** How long the mock spends in each state before the next, in seconds. */
export const RUN_TIMELINE = { accepted: 5, running: 10, completed: 120 } as const;

// Kept on globalThis so runs survive dev hot reloads, like the scenarios do.
const globalStore = globalThis as typeof globalThis & { mockRuns?: RunRecord[] };
const runs: RunRecord[] = (globalStore.mockRuns ??= []);

function toRun(record: RunRecord, now: number): MockRun {
  const elapsed = (now - record.startedAt) / 1000;
  const status: RunStatus =
    elapsed >= RUN_TIMELINE.completed
      ? "completed"
      : elapsed >= RUN_TIMELINE.running
        ? "running"
        : elapsed >= RUN_TIMELINE.accepted
          ? "accepted"
          : "queued";
  const at = (seconds: number) => new Date(record.startedAt + seconds * 1000).toISOString();
  const updated =
    status === "queued"
      ? 0
      : status === "accepted"
        ? RUN_TIMELINE.accepted
        : status === "running"
          ? RUN_TIMELINE.running
          : RUN_TIMELINE.completed;
  return {
    correlationId: record.correlationId,
    scenarioId: record.scenarioId,
    status,
    runId: status === "queued" ? null : `run-${record.correlationId.slice(0, 8)}`,
    attempt: 1,
    engine: record.engine,
    createdAt: at(0),
    updatedAt: at(updated),
  };
}

/**
 * Triggers a scenario's run. A request repeated with the same idempotency key returns the run
 * it created the first time. The scenario becomes `active`, so its config can no longer change.
 *
 * @param scenarioId - The scenario.
 * @param idempotencyKey - The `Idempotency-Key` header, if sent.
 * @param engine - Which engine runs it.
 * @param now - The current time, in milliseconds (for tests).
 * @returns The run, and whether this request created it.
 * @throws {MockApiError} 404 for an unknown scenario; 409 `scenario_not_triggerable` when it is
 *   not a draft; 422 `scenario_invalid` listing the issues that stop it from running.
 */
export function triggerRun(
  scenarioId: string,
  idempotencyKey: string | null,
  engine: string,
  now: number = Date.now(),
): { run: MockRun; created: boolean } {
  const repeat = idempotencyKey
    ? runs.find((r) => r.scenarioId === scenarioId && r.idempotencyKey === idempotencyKey)
    : undefined;
  if (repeat) return { run: toRun(repeat, now), created: false };

  const detail = getScenarioDetail(scenarioId);
  if (detail.status !== "draft") {
    throw new MockApiError(409, "Only a draft scenario can be run.", {
      code: "scenario_not_triggerable",
      params: { status: detail.status },
    });
  }
  const { issues } = getScenarioConfig(scenarioId);
  if (issues.length > 0) {
    throw new MockApiError(422, summarizeProblems(issues), {
      code: "scenario_invalid",
      problems: issues.map(({ code, message, params, path }) => ({
        code,
        message,
        ...(params && { params }),
        ...(path && { path }),
      })),
    });
  }

  const record: RunRecord = {
    correlationId: crypto.randomUUID(),
    scenarioId,
    idempotencyKey,
    engine,
    startedAt: now,
  };
  runs.push(record);
  markScenarioActive(scenarioId);
  return { run: toRun(record, now), created: true };
}

/**
 * The run of a scenario (a scenario has at most one).
 *
 * @throws {MockApiError} 404 `run_not_found` when the scenario has not been run.
 */
export function getScenarioRun(scenarioId: string, now: number = Date.now()): MockRun {
  getScenarioDetail(scenarioId);
  const record = runs.find((r) => r.scenarioId === scenarioId);
  if (!record)
    throw new MockApiError(404, "This scenario has not been run.", { code: "run_not_found" });
  return toRun(record, now);
}

/**
 * A run by its correlation id.
 *
 * @throws {MockApiError} 404 `run_not_found`.
 */
export function getRun(correlationId: string, now: number = Date.now()): MockRun {
  const record = runs.find((r) => r.correlationId === correlationId);
  if (!record) throw new MockApiError(404, "No such run.", { code: "run_not_found" });
  return toRun(record, now);
}
