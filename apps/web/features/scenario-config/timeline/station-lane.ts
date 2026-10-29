import type { ScheduleBlock, StationMode } from "../types";
import { hourToPct } from "./geometry";

/** A block drawn on a station's lane, in hours from the run start and as percentages. */
export type LaneSegment = {
  mode: StationMode;
  /** Hours from the run start. */
  from: number;
  hours: number;
  leftPct: number;
  widthPct: number;
};

/** A break or tea break drawn on a lane. */
export type BreakMark = {
  kind: "break" | "tea";
  /** Hours from the run start. */
  at: number;
  /** Length, in hours. */
  duration: number;
  leftPct: number;
  widthPct: number;
};

/** The blocks of a schedule, laid out over the run. */
export function laneSegments(schedule: ScheduleBlock[], runHours: number): LaneSegment[] {
  let from = 0;
  return schedule.map((block) => {
    const segment = {
      mode: block.mode,
      from,
      hours: block.hours,
      leftPct: hourToPct(from, runHours),
      widthPct: hourToPct(block.hours, runHours),
    };
    from += block.hours;
    return segment;
  });
}

/** A small stable hash of a string, so "random" placements stay put between renders. */
export function hashString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Where a station sits among the stations drawn, for staggering tea breaks. */
export type StationPlace = { id: string; index: number; count: number };

/**
 * Where a station's breaks fall over the run, as the design places them:
 * - a regular break every `everyHours` inside its block (never at the block's end);
 * - tea breaks spread evenly over the block, one per slot. Staggered ones shift with the
 *   station's position, so neighbouring stations don't pause together; random ones move by a
 *   hash of the station and break, so they stay put between renders.
 *
 * @param schedule - The station's schedule.
 * @param runHours - Length of the run.
 * @param place - The station, its position and how many stations there are.
 */
export function breakMarks(
  schedule: ScheduleBlock[],
  runHours: number,
  place: StationPlace,
): BreakMark[] {
  const marks: Array<Omit<BreakMark, "leftPct" | "widthPct">> = [];
  const { id, index, count } = place;

  laneSegments(schedule, runHours).forEach((segment, blockIndex) => {
    let teaIndex = 0;
    schedule[blockIndex].breaks.forEach((item, breakIndex) => {
      if (item.type === "break") {
        const every = item.everyHours > 0 ? item.everyHours : segment.hours;
        for (let t = every, n = 0; t < segment.hours - 1e-9 && n < 200; t += every, n++) {
          marks.push({ kind: "break", at: segment.from + t, duration: item.durationHours });
        }
        return;
      }
      const duration = item.durationMinutes / 60;
      const times = clamp(Math.round(item.count), 1, Math.floor(segment.hours / duration) || 1);
      const slot = segment.hours / times;
      const room = Math.max(0, slot - duration);
      const phase = (index + teaIndex * Math.floor(count / 2)) % Math.max(1, count);
      teaIndex += 1;
      for (let k = 0; k < times; k++) {
        const share =
          item.pattern === "random"
            ? 0.1 + 0.8 * ((hashString(`${id}|${blockIndex}|${breakIndex}|${k}`) % 1000) / 1000)
            : count > 1
              ? 0.1 + (0.8 * phase) / (count - 1)
              : 0.5;
        marks.push({ kind: "tea", at: segment.from + k * slot + room * share, duration });
      }
    });
  });

  return marks
    .sort((a, b) => a.at - b.at)
    .map((mark) => ({
      ...mark,
      leftPct: hourToPct(mark.at, runHours),
      widthPct: hourToPct(mark.duration, runHours),
    }));
}
