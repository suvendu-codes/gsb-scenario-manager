import type { ScheduleBlock } from "../types";
import { maxTeaCount } from "../validation";

/** Schedule periods are whole half hours. */
export const HALF_HOUR = 0.5;

/** Length of a tea break when one is added. */
export const TEA_DEFAULT_MINUTES = 10;

const round = (value: number, step: number): number => Math.round(value / step) * step;

/** Longest tea break a period of this length can hold, in minutes (at most 120). */
export function maxTeaMinutes(hours: number): number {
  return Math.min(120, Math.max(5, Math.floor(hours * 60)));
}

/** Shortens a block's tea breaks so they still fit its length. */
function fitTeaBreaks(block: ScheduleBlock): ScheduleBlock {
  const longest = maxTeaMinutes(block.hours);
  return {
    ...block,
    teaBreaks: block.teaBreaks.map((tea) => {
      const durationMinutes = Math.min(tea.durationMinutes, longest);
      return {
        ...tea,
        durationMinutes,
        count: Math.min(tea.count, maxTeaCount(block.hours, durationMinutes)),
      };
    }),
  };
}

/** A new tea break for a period: once, staggered, with the default length. */
export function newTeaBreak(id: string): ScheduleBlock["teaBreaks"][number] {
  return { id, pattern: "staggered", durationMinutes: TEA_DEFAULT_MINUTES, count: 1 };
}

/** The modes a station works in over its schedule, without repeats and without `off`. */
export function scheduledModes(
  blocks: ScheduleBlock[],
): Array<Exclude<ScheduleBlock["mode"], "off">> {
  const modes: Array<Exclude<ScheduleBlock["mode"], "off">> = [];
  for (const block of blocks) {
    if (block.mode !== "off" && !modes.includes(block.mode)) modes.push(block.mode);
  }
  return modes;
}

/** The hour each period starts at. */
export function blockStarts(blocks: ScheduleBlock[]): number[] {
  const starts: number[] = [];
  let at = 0;
  for (const block of blocks) {
    starts.push(at);
    at += block.hours;
  }
  return starts;
}

/** The neighbour that gives or takes time when block `i` is resized: the next one, else the previous. */
function neighbour(blocks: ScheduleBlock[], i: number): number {
  return i < blocks.length - 1 ? i + 1 : i - 1;
}

/**
 * Resizes one period. The neighbour absorbs the difference, so the schedule still fills the
 * run; neither can go below half an hour.
 *
 * @param blocks - The schedule.
 * @param i - Index of the period to resize.
 * @param hours - The wanted length; snapped to half hours.
 */
export function resizeBlock(blocks: ScheduleBlock[], i: number, hours: number): ScheduleBlock[] {
  if (blocks.length < 2) return blocks;
  const j = neighbour(blocks, i);
  const pool = blocks[i].hours + blocks[j].hours;
  const next = Math.min(Math.max(round(hours, HALF_HOUR), HALF_HOUR), pool - HALF_HOUR);
  return blocks.map((block, k) =>
    k === i
      ? fitTeaBreaks({ ...block, hours: next })
      : k === j
        ? fitTeaBreaks({ ...block, hours: pool - next })
        : block,
  );
}

/** The longest period `i` can be made: its own length plus its neighbour's, less half an hour. */
export function maxBlockHours(blocks: ScheduleBlock[], i: number): number {
  if (blocks.length < 2) return blocks[i]?.hours ?? 0;
  const j = neighbour(blocks, i);
  return blocks[i].hours + blocks[j].hours - HALF_HOUR;
}

/**
 * Splits a period in two halves. Both keep the mode; the second half gets copies of the tea
 * breaks with new ids.
 *
 * @param blocks - The schedule.
 * @param i - Index of the period to split.
 * @param makeId - Makes an id for each copied tea break.
 * @returns The schedule unchanged if the period is shorter than one hour.
 */
export function splitBlock(
  blocks: ScheduleBlock[],
  i: number,
  makeId: () => string,
): ScheduleBlock[] {
  const block = blocks[i];
  if (block.hours < 2 * HALF_HOUR) return blocks;
  const first = Math.max(HALF_HOUR, round(block.hours / 2, HALF_HOUR));
  return [
    ...blocks.slice(0, i),
    fitTeaBreaks({ ...block, hours: first }),
    fitTeaBreaks({
      ...block,
      hours: block.hours - first,
      teaBreaks: block.teaBreaks.map((tea) => ({ ...tea, id: makeId() })),
    }),
    ...blocks.slice(i + 1),
  ];
}

/**
 * Removes a period; the previous one (or the next, for the first) takes its time.
 *
 * @returns The schedule unchanged if it has only one period.
 */
export function removeBlock(blocks: ScheduleBlock[], i: number): ScheduleBlock[] {
  if (blocks.length < 2) return blocks;
  const j = i > 0 ? i - 1 : 1;
  const out = blocks.map((block, k) =>
    k === j ? fitTeaBreaks({ ...block, hours: block.hours + blocks[i].hours }) : block,
  );
  out.splice(i, 1);
  return out;
}

/**
 * Rescales a schedule to a new run length, keeping the proportions as far as half hours allow.
 * Periods that no longer fit are dropped from the end. Used when the run duration changes.
 *
 * @param blocks - The schedule.
 * @param from - The old run length, in hours.
 * @param to - The new run length, in hours.
 */
export function scaleBlocks(blocks: ScheduleBlock[], from: number, to: number): ScheduleBlock[] {
  if (blocks.length === 0 || from === to) return blocks;
  const fit = blocks.slice(0, Math.max(1, Math.floor(to / HALF_HOUR)));
  const scaled = fit.map((block) =>
    fitTeaBreaks({
      ...block,
      hours: Math.max(HALF_HOUR, round((block.hours * to) / from, HALF_HOUR)),
    }),
  );

  let diff = to - scaled.reduce((sum, block) => sum + block.hours, 0);
  while (Math.abs(diff) >= HALF_HOUR / 2) {
    const step = diff > 0 ? HALF_HOUR : -HALF_HOUR;
    const candidates = scaled
      .map((block, index) => ({ hours: block.hours, index }))
      .filter(({ hours }) => step > 0 || hours > HALF_HOUR);
    if (candidates.length === 0) break;
    const { index } = candidates.reduce((best, c) => (c.hours > best.hours ? c : best));
    scaled[index] = fitTeaBreaks({ ...scaled[index], hours: scaled[index].hours + step });
    diff -= step;
  }
  return scaled;
}
