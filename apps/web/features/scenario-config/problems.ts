import type { Problem } from "@/lib/api/error";

type Params = Record<string, string | number | boolean>;
type NoParams = Record<string, never>;

/** Builds a problem's English fallback message from its params and, when it has one, its path. */
type Template<P extends Params> = (params: P, path: string | undefined) => string;

/** Keeps each template's param type, so `configProblem` can check the params for its code. */
const template = <P extends Params>(build: Template<P>): Template<P> => build;

const withPath = (path: string | undefined, reason: string): string =>
  path ? `${path}: ${reason}` : reason;

/**
 * Every problem the scenario config reports, by stable code. Each code has a fixed set of
 * params and an English fallback message built from them. Clients branch on the code and use
 * the params to say it in their own words; they never parse the message.
 */
export const CONFIG_PROBLEMS = {
  // A change that can't be applied.
  INVALID_BODY: template<{ reason: string }>((p, path) => withPath(path, p.reason)),
  UNKNOWN_PATH: template<{ path: string }>((p) => `Unknown config path: ${p.path}`),
  NOT_A_SINGLE_VALUE: template<{ path: string }>(
    (p) => `Can't set ${p.path}: it is not a single config value.`,
  ),
  INVALID_VALUE: template<{ reason: string }>((p, path) => withPath(path, p.reason)),

  // Rules that span several values.
  DATA_WINDOW_EMPTY: template<{ startHour: number; endHour: number }>(
    () => "The data window must start before it ends.",
  ),
  ORDER_TYPES_DUPLICATE: template<NoParams>(() => "Order types can't be listed twice."),
  SCHEDULER_WEIGHTS_ALL_ZERO: template<NoParams>(
    () => "The pick scheduler weights can't all be 0.",
  ),
  SCHEDULE_TOTAL_MISMATCH: template<{
    stationId: string;
    actualHours: number;
    expectedHours: number;
  }>(
    (p) =>
      `${p.stationId}: the schedule adds up to ${p.actualHours}h, but the run is ${p.expectedHours}h.`,
  ),
  TEA_BREAK_TOO_LONG: template<{ stationId: string; periodHours: number; durationMinutes: number }>(
    (p) => `${p.stationId}: a tea break is longer than its ${p.periodHours}h block.`,
  ),
  BREAK_EVERY_TOO_LONG: template<{ stationId: string; periodHours: number; everyHours: number }>(
    (p) =>
      `${p.stationId}: a break every ${p.everyHours}h never happens in a ${p.periodHours}h block.`,
  ),
  SCHEDULE_MODE_REPEATED: template<{ stationId: string; mode: string }>(
    (p) => `${p.stationId}: ${p.mode} is scheduled in more than one block.`,
  ),
  MODE_NOT_ALLOWED: template<{ stationId: string; mode: string }>(
    (p) => `${p.stationId} can't work in ${p.mode}; the site registry doesn't allow it.`,
  ),
  TEA_BREAK_TOO_MANY: template<{
    stationId: string;
    periodHours: number;
    durationMinutes: number;
    count: number;
  }>(
    (p) => `${p.stationId}: too many tea breaks of ${p.durationMinutes} min in ${p.periodHours}h.`,
  ),
  STAFFED_POSITIONS_EXCEED: template<{
    stationId: string;
    staffedPositions: number;
    frontPositions: number;
  }>((p) => `${p.stationId}: more staffed positions than front positions.`),
  PUT_FLOW_NOT_ALLOWED: template<{
    stationId: string;
    flowId: string;
    side: string;
    category: string;
  }>((p) => `${p.stationId}: "${p.flowId}" is not a ${p.side} put flow for ${p.category}.`),

  // Problems that would stop the run (`issues`).
  DATASET_MISSING_OR_INVALID: template<NoParams>(
    () => "A dataset is missing or doesn’t match the site map",
  ),
  NO_ORDER_TYPE: template<NoParams>(() => "Choose at least one order type"),
  NO_STATION_SCHEDULED: template<NoParams>(() => "No station is scheduled to work"),
  PUT_FLOW_MISSING: template<{ stationId: string }>((p) => `${p.stationId} has no put behaviour`),
  NO_BOTS: template<NoParams>(() => "The fleet has no bots"),
} as const;

/** A code the scenario config can report. */
export type ConfigProblemCode = keyof typeof CONFIG_PROBLEMS;

type ParamsOf<C extends ConfigProblemCode> = Parameters<(typeof CONFIG_PROBLEMS)[C]>[0];

/**
 * Builds a problem for the scenario config: its code, the params that go with the code, the
 * English fallback message made from them, and the path of the value it is about.
 *
 * @param code - Which problem.
 * @param params - The values for that code; codes with none take `{}`.
 * @param path - Where it is, in dot notation, when it belongs to one value.
 */
export function configProblem<C extends ConfigProblemCode>(
  code: C,
  params: ParamsOf<C>,
  path?: string,
): Problem {
  const build = CONFIG_PROBLEMS[code] as Template<Params>;
  return {
    code,
    message: build(params, path),
    ...(Object.keys(params).length > 0 && { params }),
    ...(path && { path }),
  };
}
