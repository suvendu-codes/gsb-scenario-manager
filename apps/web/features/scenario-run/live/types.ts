import type { ScheduleBlock, StationMode } from "@/features/scenario-config/types";

/** What a run is played from: the scenario as it was when the run started. */
export type RunInputs = {
  scenarioId: string;
  scenarioName: string;
  /** Length of the run, in hours. */
  runHours: number;
  /** Clock hour the run starts at (warehouse time). */
  startClock: number;
  /** Clock hour after which orders are not released. */
  cutoffHour: number;
  stations: Array<{
    id: string;
    label: string;
    schedule: ScheduleBlock[];
    /** Most carriers that can wait at the station. */
    queueLimit: number;
  }>;
  /** Bots in the fleet at the start. */
  bots: number;
};

/** A change the user made during the run. Logged, and shown on the timeline. */
export type LiveChange =
  | { kind: "station"; atH: number; stationId: string; on: boolean }
  | { kind: "bots"; atH: number; bots: number };

/** Where the run is, and what the user changed: everything the engine needs besides the inputs. */
export type RunControl = {
  /** Hours into the run, on the warehouse clock. */
  nowH: number;
  /** Set when the user stopped the run early, at that hour. */
  stoppedAtH: number | null;
  paused: boolean;
  changes: LiveChange[];
};

/** Where the run stands. */
export type RunPhase = "warming-up" | "running" | "paused" | "stopped" | "completed";

/** How a measure is doing. `waiting` while warming up, `done` for a finished total. */
export type KpiStatus = "ok" | "watch" | "waiting" | "done";

/** One "how the run is doing" tile. */
export type Kpi = {
  id: string;
  label: string;
  /** The value as shown ("2,112"); null while waiting. */
  value: string | null;
  /** Text after the value ("of 9,102 units"). */
  unit: string;
  /** The line under it ("Volume so far"). */
  detail: string;
  status: KpiStatus;
};

/** What a station is doing now. */
export type StationState =
  "starting" | "working" | "queue-full" | "on-break" | "off-shift" | "stopped";

/** A station, live. */
export type StationLive = {
  id: string;
  label: string;
  state: StationState;
  /** The mode it works in now, if it is in a block. */
  mode: StationMode | null;
  /** Carriers waiting, and the most that can. Null when it is not working. */
  queue: number | null;
  queueLimit: number;
  /** Operator wait per task, in seconds. Null when it is not working. */
  operatorWait: number | null;
  /** Tasks open, and how many are needed to keep it busy. */
  tasks: number | null;
  tasksNeeded: number;
  /** Picks in the last 30 minutes, and its average for 30 minutes. */
  picksWindow: number | null;
  picksAverage: number;
  /** What comes next ("Put from 4h"), if anything. */
  next: string | null;
  /** True when the user turned it off. */
  turnedOff: boolean;
};

/** Bots, live. */
export type BotsLive = { total: number; working: number; ready: number; error: number };

/** Something that happened in the run. */
export type RunEvent = {
  id: string;
  atH: number;
  title: string;
  /** Where it came from ("Station · PPS 1"). */
  source: string;
  type: "run" | "schedule" | "warehouse" | "change";
  severity: "info" | "warning";
};

/** Everything the run screen shows at one moment. */
export type RunSnapshot = {
  phase: RunPhase;
  nowH: number;
  runHours: number;
  /** Warehouse clock time now, as hours of the day. */
  clockH: number;
  kpis: Kpi[];
  stations: StationLive[];
  bots: BotsLive;
  /** Events up to now, oldest first. */
  events: RunEvent[];
  /** The most pressing thing to look at, or null when nothing needs attention. */
  attention: string | null;
  /** Warehouse events on the timeline (scripted incidents), as hour spans. */
  incidents: Array<{ fromH: number; toH: number; title: string }>;
};

/**
 * The events-and-metrics engine: given what the run is played from and what the user did, what
 * the screen shows. The mock below computes it in the browser; a real one would read a running
 * emulation. Swapping it changes nothing else.
 */
export type RunEngine = {
  snapshot(inputs: RunInputs, control: RunControl): RunSnapshot;
};
