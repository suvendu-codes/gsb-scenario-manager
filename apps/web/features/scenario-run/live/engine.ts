import { clockLabel } from "@/features/scenario-config/timeline/geometry";
import {
  breakMarks,
  hashString,
  laneSegments,
} from "@/features/scenario-config/timeline/station-lane";
import type { StationMode } from "@/features/scenario-config/types";

import type {
  BotsLive,
  Kpi,
  KpiStatus,
  LiveChange,
  RunControl,
  RunEngine,
  RunEvent,
  RunInputs,
  RunPhase,
  StationLive,
  StationState,
} from "./types";

/**
 * The mock events-and-metrics engine. Everything here is made up, but deterministic: the same
 * inputs and changes at the same hour always give the same screen, so it can be tested and
 * demoed. Stations follow their configured schedules and breaks; the numbers come from a hash
 * of the station and the time, around plausible values. Replace `runEngine` (bottom of the
 * file) to read a real emulation instead.
 */

/** The run "warms up" for its first five minutes: measures wait, stations are starting. */
export const WARMUP_H = 5 / 60;
/** Units a working station handles in an hour, before its own variation. */
const UNITS_PER_STATION_HOUR = 200;
/** Steps used to add up working time, in hours (five minutes). */
const STEP_H = 1 / 12;
/** The scripted warehouse incident: one bot in error from 3h for 20 minutes. */
const INCIDENT = { fromH: 3, toH: 3 + 20 / 60, title: "A bot is in error" };

const MODE_LABEL: Record<StationMode, string> = { pick: "Pick", put: "Put", audit: "Audit" };

/** A stable number in [0, 1) for a key. */
const noise = (key: string) => (hashString(key) % 1000) / 1000;

/** "1h 51m". */
export function formatHM(hours: number): string {
  const minutes = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

const thousands = (n: number) => Math.round(n).toLocaleString("en-US");

function phaseOf(inputs: RunInputs, control: RunControl): RunPhase {
  if (control.stoppedAtH !== null) return "stopped";
  if (control.nowH >= inputs.runHours) return "completed";
  if (control.nowH < WARMUP_H) return "warming-up";
  return control.paused ? "paused" : "running";
}

/** Whether the user has the station on at an hour (on unless turned off, until turned on again). */
function stationOn(changes: LiveChange[], id: string, atH: number): boolean {
  let on = true;
  for (const change of changes) {
    if (change.kind === "station" && change.stationId === id && change.atH <= atH) on = change.on;
  }
  return on;
}

/** The fleet size at an hour. */
function botsAt(inputs: RunInputs, changes: LiveChange[], atH: number): number {
  let bots = inputs.bots;
  for (const change of changes) if (change.kind === "bots" && change.atH <= atH) bots = change.bots;
  return bots;
}

type Station = RunInputs["stations"][number];

/** What a station does at an hour, from its schedule and breaks alone. */
function scheduled(inputs: RunInputs, station: Station, index: number, atH: number) {
  const segments = laneSegments(station.schedule, inputs.runHours);
  const block = segments.find((s) => atH >= s.from && atH < s.from + s.hours) ?? null;
  const place = { id: station.id, index, count: inputs.stations.length };
  const onBreak = breakMarks(station.schedule, inputs.runHours, place).some(
    (mark) => atH >= mark.at && atH < mark.at + mark.duration,
  );
  return { segments, block, onBreak };
}

/** A station's share of the standard rate, between 0.9 and 1.1. */
const stationRate = (id: string) => UNITS_PER_STATION_HOUR * (0.9 + 0.2 * noise(`rate|${id}`));

/** Hours a station spends working between two hours (in a block, not on a break, turned on). */
function workingHours(
  inputs: RunInputs,
  station: Station,
  index: number,
  fromH: number,
  toH: number,
  changes: LiveChange[],
): number {
  let hours = 0;
  for (let t = fromH; t < toH - 1e-9; t += STEP_H) {
    const at = Math.min(t + STEP_H / 2, toH);
    const { block, onBreak } = scheduled(inputs, station, index, at);
    if (block && !onBreak && stationOn(changes, station.id, at)) hours += Math.min(STEP_H, toH - t);
  }
  return hours;
}

function stationLive(
  inputs: RunInputs,
  control: RunControl,
  phase: RunPhase,
  station: Station,
  index: number,
): StationLive {
  const now = control.nowH;
  const { segments, block, onBreak } = scheduled(inputs, station, index, now);
  const turnedOff = !stationOn(control.changes, station.id, now);
  const slot = Math.floor(now * 6);
  const queueFull = noise(`queue-full|${station.id}|${slot}`) < 0.08;

  const state: StationState = turnedOff
    ? "stopped"
    : phase === "warming-up"
      ? "starting"
      : !block
        ? "off-shift"
        : onBreak
          ? "on-break"
          : queueFull
            ? "queue-full"
            : "working";
  const working = state === "working" || state === "queue-full";

  const upcoming = segments.find((s) => s.from > now + 1e-9);
  const rate = stationRate(station.id);
  return {
    id: station.id,
    label: station.label,
    state,
    mode: block?.mode ?? null,
    queue: working
      ? state === "queue-full"
        ? station.queueLimit
        : 2 + Math.floor(noise(`queue|${station.id}|${slot}`) * Math.max(1, station.queueLimit - 3))
      : null,
    queueLimit: station.queueLimit,
    operatorWait: working
      ? Math.round((3.2 + 1.6 * noise(`owt|${station.id}|${slot}`)) * 10) / 10
      : null,
    tasks: working ? 3 + Math.floor(noise(`tasks|${station.id}|${slot}`) * 5) : null,
    tasksNeeded: 8,
    picksWindow: working
      ? Math.round(rate * 0.5 * (0.8 + 0.4 * noise(`picks|${station.id}|${slot}`)))
      : null,
    picksAverage: Math.round(rate * 0.5),
    next: upcoming
      ? `${MODE_LABEL[upcoming.mode]} from ${formatHM(upcoming.from).replace(" 00m", "")}`
      : null,
    turnedOff,
  };
}

function bots(inputs: RunInputs, control: RunControl, phase: RunPhase): BotsLive {
  const total = botsAt(inputs, control.changes, control.nowH);
  if (phase === "warming-up") return { total, working: 0, ready: total, error: 0 };
  const error =
    control.nowH >= INCIDENT.fromH && control.nowH < INCIDENT.toH && inputs.runHours > INCIDENT.toH
      ? Math.min(1, total)
      : 0;
  const working = Math.round((total - error) * 0.9);
  return { total, working, ready: total - error - working, error };
}

function kpis(inputs: RunInputs, control: RunControl, phase: RunPhase): Kpi[] {
  const ids = ["throughput", "uph", "breaches", "pbt", "owt", "rtr", "ppf", "tasks"] as const;
  const labels = {
    throughput: "Throughput",
    uph: "UPH",
    breaches: "Order breaches",
    pbt: "PBT breach rate",
    owt: "Operator wait",
    rtr: "Rack to rack",
    ppf: "Picks per face",
    tasks: "Tasks per station",
  };
  if (phase === "warming-up") {
    return ids.map((id) => ({
      id,
      label: labels[id],
      value: null,
      unit: "",
      detail: "",
      status: "waiting",
    }));
  }

  const ended = phase === "stopped" || phase === "completed";
  const now = control.nowH;
  const slot = ended ? "end" : String(Math.floor(now * 2));
  const planned = inputs.stations.reduce(
    (sum, s, i) => sum + workingHours(inputs, s, i, 0, inputs.runHours, []) * stationRate(s.id),
    0,
  );
  let done = 0;
  let stationHours = 0;
  inputs.stations.forEach((s, i) => {
    const hours = workingHours(inputs, s, i, WARMUP_H, now, control.changes);
    stationHours += hours;
    done += hours * stationRate(s.id);
  });
  const uph = stationHours > 0 ? done / stationHours : 0;
  const breaches = 0.6 + 0.6 * noise(`breaches|${inputs.scenarioId}|${slot}`);
  const pbt = 0.5 + 0.8 * noise(`pbt|${inputs.scenarioId}|${slot}`);
  const owt = 3.4 + 1.2 * noise(`owt|${inputs.scenarioId}|${slot}`);
  const status = (watch: boolean): KpiStatus => (watch ? "watch" : "ok");
  const window = ended ? "Run average" : "This window";

  return [
    {
      id: "throughput",
      label: labels.throughput,
      value: thousands(done),
      unit: ended ? "units" : `of ${thousands(planned)} units`,
      detail:
        phase === "completed"
          ? `Completed in ${formatHM(now)}`
          : phase === "stopped"
            ? `Up to ${formatHM(now)}, when it stopped`
            : "Volume so far",
      status: ended ? "done" : "ok",
    },
    {
      id: "uph",
      label: labels.uph,
      value: thousands(uph),
      unit: ended ? "run average" : `avg ${thousands(UNITS_PER_STATION_HOUR)}`,
      detail: "Per station",
      status: status(uph < UNITS_PER_STATION_HOUR * 0.8),
    },
    {
      id: "breaches",
      label: labels.breaches,
      value: `${breaches.toFixed(1)}%`,
      unit: "of due orders",
      detail: "SLA health",
      status: status(breaches >= 1),
    },
    {
      id: "pbt",
      label: labels.pbt,
      value: `${pbt.toFixed(1)}%`,
      unit: ended ? "whole run" : "due so far",
      detail: "Pick-before time",
      status: status(pbt >= 1),
    },
    {
      id: "owt",
      label: labels.owt,
      value: `${owt.toFixed(1)} s`,
      unit: "per task",
      detail: ended
        ? window
        : owt > 4.5
          ? "Operators are waiting on work"
          : "Operators are not the constraint",
      status: status(owt > 4.5),
    },
    {
      id: "rtr",
      label: labels.rtr,
      value: `${(4 + 0.6 * noise(`rtr|${slot}`)).toFixed(1)} s`,
      unit: "per face",
      detail: ended ? window : "Travel between presentations",
      status: "ok",
    },
    {
      id: "ppf",
      label: labels.ppf,
      value: String(15 + Math.round(4 * noise(`ppf|${slot}`))),
      unit: "picks",
      detail: window,
      status: "ok",
    },
    {
      id: "tasks",
      label: labels.tasks,
      value: String(5 + Math.round(3 * noise(`tasks|${slot}`))),
      unit: "open",
      detail: ended ? window : "Across working stations",
      status: "ok",
    },
  ];
}

function events(inputs: RunInputs, control: RunControl, phase: RunPhase): RunEvent[] {
  const list: Omit<RunEvent, "id">[] = [
    {
      atH: 0,
      title: `Run started and lasts ${formatHM(inputs.runHours)}`,
      source: `Run · ${inputs.scenarioName}`,
      type: "run",
      severity: "info",
    },
    {
      atH: 0,
      title: `Fleet is ${inputs.bots} bots`,
      source: "Agents",
      type: "run",
      severity: "info",
    },
    {
      atH: 0,
      title: `Order cutoff is ${clockLabel(inputs.cutoffHour)}`,
      source: "WMS",
      type: "run",
      severity: "info",
    },
  ];
  const cutoffAt = inputs.cutoffHour - inputs.startClock;
  if (cutoffAt > 0 && cutoffAt < inputs.runHours) {
    list.push({
      atH: cutoffAt,
      title: "Order cutoff: no new orders are released",
      source: "WMS",
      type: "schedule",
      severity: "info",
    });
  }
  for (const station of inputs.stations) {
    for (const segment of laneSegments(station.schedule, inputs.runHours)) {
      if (segment.from > 0) {
        list.push({
          atH: segment.from,
          title: `${station.label} switched to ${MODE_LABEL[segment.mode]}`,
          source: `Station · ${station.label}`,
          type: "schedule",
          severity: "info",
        });
      }
    }
  }
  if (inputs.runHours > INCIDENT.toH) {
    list.push({
      atH: INCIDENT.fromH,
      title: INCIDENT.title,
      source: "Warehouse · Bot fault",
      type: "warehouse",
      severity: "warning",
    });
    list.push({
      atH: INCIDENT.toH,
      title: "The bot is back in service",
      source: "Warehouse · Bot fault",
      type: "warehouse",
      severity: "info",
    });
  }
  for (const change of control.changes) {
    const label = (id: string) => inputs.stations.find((s) => s.id === id)?.label ?? id;
    list.push(
      change.kind === "station"
        ? {
            atH: change.atH,
            title: `${label(change.stationId)} was turned ${change.on ? "on" : "off"}`,
            source: "Live change",
            type: "change",
            severity: change.on ? "info" : "warning",
          }
        : {
            atH: change.atH,
            title: `Fleet changed to ${change.bots} bots`,
            source: "Live change",
            type: "change",
            severity: "info",
          },
    );
  }
  if (phase === "completed")
    list.push({
      atH: inputs.runHours,
      title: "Run completed",
      source: "Run",
      type: "run",
      severity: "info",
    });
  if (phase === "stopped")
    list.push({
      atH: control.nowH,
      title: `Run stopped at ${formatHM(control.nowH)}`,
      source: "Run",
      type: "run",
      severity: "warning",
    });

  return list
    .filter((event) => event.atH <= control.nowH + 1e-9)
    .sort((a, b) => a.atH - b.atH)
    .map((event, i) => ({ ...event, id: `e${i}` }));
}

/** The mock engine. */
export const mockRunEngine: RunEngine = {
  snapshot(inputs, control) {
    const stoppedAt = control.stoppedAtH;
    const effective: RunControl = {
      ...control,
      nowH: Math.min(stoppedAt ?? control.nowH, inputs.runHours),
    };
    const phase = phaseOf(inputs, { ...effective, stoppedAtH: stoppedAt });
    const stations = inputs.stations.map((s, i) => stationLive(inputs, effective, phase, s, i));
    const fleet = bots(inputs, effective, phase);
    const queueFull = stations.filter((s) => s.state === "queue-full");
    const attention =
      phase === "warming-up"
        ? "Warming up. Measures fill in after the first few minutes."
        : fleet.error > 0
          ? `${fleet.error} bot in error. It is being recovered.`
          : queueFull.length > 0 && phase === "running"
            ? `${queueFull.map((s) => s.label).join(", ")}: queue full. Carriers are waiting.`
            : null;
    return {
      phase,
      nowH: effective.nowH,
      runHours: inputs.runHours,
      clockH: inputs.startClock + effective.nowH,
      kpis: kpis(inputs, effective, phase),
      stations,
      bots: fleet,
      events: events(inputs, effective, phase),
      attention,
      incidents: inputs.runHours > INCIDENT.toH ? [INCIDENT] : [],
    };
  },
};

/** The engine the run screen uses. Swap this one line to play a real emulation. */
export const runEngine: RunEngine = mockRunEngine;
