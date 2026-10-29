import { deepEqual } from "../paths";
import type { ScheduleBlock, StationMode } from "../types";
import { hourToPct } from "./geometry";
import { laneSegments, type BreakMark } from "./station-lane";

/** A span of a type's row: a mode its stations share there, or `mixed` where they differ. */
export type TypeSegment = {
  mode: StationMode | "mixed";
  from: number;
  hours: number;
  leftPct: number;
  widthPct: number;
};

const span = (mode: TypeSegment["mode"], from: number, to: number, run: number): TypeSegment => ({
  mode,
  from,
  hours: to - from,
  leftPct: hourToPct(from, run),
  widthPct: hourToPct(to - from, run),
});

/**
 * The summary row of a station type, as the design draws it:
 * - when every station has the same schedule, its blocks;
 * - when they run the same modes in the same order but switch at different times, each mode
 *   where all agree, with `mixed` spans where the switch times differ;
 * - otherwise one `mixed` span over the whole run.
 * Unassigned stations (no blocks) count as different. No row for a type with no blocks at all.
 *
 * @param schedules - The schedules of the type's stations.
 * @param runHours - Length of the run.
 */
export function typeSegments(schedules: ScheduleBlock[][], runHours: number): TypeSegment[] {
  const [first] = schedules;
  if (!first || schedules.every((schedule) => schedule.length === 0)) return [];

  const shapes = schedules.map((schedule) => schedule.map(({ mode, hours }) => ({ mode, hours })));
  if (shapes.every((shape) => deepEqual(shape, shapes[0]))) {
    return laneSegments(first, runHours).map((s) =>
      span(s.mode, s.from, s.from + s.hours, runHours),
    );
  }

  const modes = first.map((block) => block.mode);
  const sameModes = schedules.every((schedule) =>
    deepEqual(
      schedule.map((block) => block.mode),
      modes,
    ),
  );
  if (!sameModes || modes.length === 0) return [span("mixed", 0, runHours, runHours)];

  const lanes = schedules.map((schedule) => laneSegments(schedule, runHours));
  const low: number[] = [];
  const high: number[] = [];
  for (let b = 1; b < modes.length; b++) {
    const starts = lanes.map((lane) => lane[b].from);
    low.push(Math.min(...starts));
    high.push(Math.max(...starts));
  }

  const out: TypeSegment[] = [];
  modes.forEach((mode, i) => {
    const from = i === 0 ? 0 : high[i - 1];
    const to = i === modes.length - 1 ? runHours : low[i];
    if (to > from + 1e-6) out.push(span(mode, from, to, runHours));
    if (i < modes.length - 1 && high[i] > low[i] + 1e-6) {
      out.push(span("mixed", low[i], high[i], runHours));
    }
  });
  return out;
}

/** A break mark on a type's row; `mixed` when the type's stations don't all have the same breaks. */
export type TypeBreakMark = BreakMark & { mixed: boolean };

const markKey = (mark: BreakMark) =>
  `${mark.at.toFixed(2)}|${mark.duration.toFixed(3)}|${mark.kind}`;

/**
 * The breaks of a type's row: every distinct break of its stations, each once. When the
 * stations' breaks differ, every mark is flagged `mixed` ("stations differ").
 *
 * @param marksPerStation - The break marks of each station of the type.
 */
export function typeBreakMarks(marksPerStation: BreakMark[][]): TypeBreakMark[] {
  const keys = marksPerStation.map((marks) => marks.map(markKey).join(","));
  const mixed = keys.some((key) => key !== keys[0]);
  const seen = new Map<string, BreakMark>();
  for (const marks of marksPerStation) {
    for (const mark of marks) if (!seen.has(markKey(mark))) seen.set(markKey(mark), mark);
  }
  return [...seen.values()].sort((a, b) => a.at - b.at).map((mark) => ({ ...mark, mixed }));
}
