import { MAX_BREAKS_PER_BLOCK, MAX_SCHEDULE_BLOCKS, STATION_MODES } from "../schema";
import type { ScheduleBlock, ScheduleBreak, StationMode } from "../types";
import { maxTeaCount, maxTeaMinutes } from "../validation";

/** Schedule blocks are whole half hours. */
export const HALF_HOUR = 0.5;

/** Length of a tea break when one is added. */
export const TEA_DEFAULT_MINUTES = 10;

const round = (value: number, step: number): number => Math.round(value / step) * step;

/** Makes a block's breaks fit its length: tea breaks shorter or fewer, regular ones more often. */
function fitBreaks(block: ScheduleBlock): ScheduleBlock {
  return {
    ...block,
    breaks: block.breaks.map((item): ScheduleBreak => {
      if (item.type === "break") {
        return { ...item, everyHours: Math.min(item.everyHours, Math.max(HALF_HOUR, block.hours)) };
      }
      const durationMinutes = Math.min(item.durationMinutes, maxTeaMinutes(block.hours));
      return {
        ...item,
        durationMinutes,
        count: Math.min(item.count, maxTeaCount(block.hours, durationMinutes)),
      };
    }),
  };
}

/**
 * A new break for a block: a regular break every 2 hours for half an hour, or a tea break of
 * the default length once per block, staggered. Fitted to the block.
 *
 * @param block - The block it is for.
 * @param type - `break` or `tea`.
 * @param id - Its id.
 */
export function newBreak(
  block: ScheduleBlock,
  type: ScheduleBreak["type"],
  id: string,
): ScheduleBreak {
  const item: ScheduleBreak =
    type === "break"
      ? { id, type, everyHours: 2, durationHours: 0.5 }
      : { id, type, pattern: "staggered", durationMinutes: TEA_DEFAULT_MINUTES, count: 1 };
  return fitBreaks({ ...block, breaks: [item] }).breaks[0];
}

/** Adds a break to a block, unless it already has the most a block can have. */
export function addBreak(
  block: ScheduleBlock,
  type: ScheduleBreak["type"],
  id: string,
): ScheduleBlock {
  if (block.breaks.length >= MAX_BREAKS_PER_BLOCK) return block;
  return { ...block, breaks: [...block.breaks, newBreak(block, type, id)] };
}

/** Replaces one break of a block, fitting it to the block. */
export function updateBreak(block: ScheduleBlock, item: ScheduleBreak): ScheduleBlock {
  return fitBreaks({
    ...block,
    breaks: block.breaks.map((current) => (current.id === item.id ? item : current)),
  });
}

/** Removes one break from a block. */
export function removeBreak(block: ScheduleBlock, id: string): ScheduleBlock {
  return { ...block, breaks: block.breaks.filter((item) => item.id !== id) };
}

/** How many times a regular break happens in a block (it never falls on the block's end). */
export function breakOccurrences(everyHours: number, blockHours: number): number {
  if (everyHours <= 0) return 0;
  return Math.max(0, Math.ceil(blockHours / everyHours - 1e-9) - 1);
}

/** The modes a station works in over its schedule, in block order. */
export function scheduledModes(blocks: ScheduleBlock[]): StationMode[] {
  return blocks.map((block) => block.mode);
}

/** The allowed modes no block uses yet, in the usual order (pick, put, audit). */
export function freeModes(blocks: ScheduleBlock[], allowed: readonly StationMode[]): StationMode[] {
  const used = new Set(scheduledModes(blocks));
  return STATION_MODES.filter((mode) => allowed.includes(mode) && !used.has(mode));
}

/** The hour each block starts at. */
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
 * Resizes one block. The neighbour absorbs the difference, so the schedule still fills the run;
 * neither can go below half an hour.
 *
 * @param blocks - The schedule.
 * @param i - Index of the block to resize.
 * @param hours - The wanted length; snapped to half hours.
 */
export function resizeBlock(blocks: ScheduleBlock[], i: number, hours: number): ScheduleBlock[] {
  if (blocks.length < 2) return blocks;
  const j = neighbour(blocks, i);
  const pool = blocks[i].hours + blocks[j].hours;
  const next = Math.min(Math.max(round(hours, HALF_HOUR), HALF_HOUR), pool - HALF_HOUR);
  return blocks.map((block, k) =>
    k === i
      ? fitBreaks({ ...block, hours: next })
      : k === j
        ? fitBreaks({ ...block, hours: pool - next })
        : block,
  );
}

/** The longest block `i` can be made: its own length plus its neighbour's, less half an hour. */
export function maxBlockHours(blocks: ScheduleBlock[], i: number): number {
  if (blocks.length < 2) return blocks[i]?.hours ?? 0;
  const j = neighbour(blocks, i);
  return blocks[i].hours + blocks[j].hours - HALF_HOUR;
}

/**
 * Gives block `i` another mode. If another block already has that mode, the two swap modes, so
 * each mode stays in one block.
 */
export function changeBlockMode(
  blocks: ScheduleBlock[],
  i: number,
  mode: StationMode,
): ScheduleBlock[] {
  const j = blocks.findIndex((block) => block.mode === mode);
  if (j === i) return blocks;
  return blocks.map((block, k) =>
    k === i ? { ...block, mode } : k === j ? { ...block, mode: blocks[i].mode } : block,
  );
}

/** Whether block `i` can be split: room for another block, a free mode, and at least an hour. */
export function canSplitBlock(
  blocks: ScheduleBlock[],
  i: number,
  allowed: readonly StationMode[],
): boolean {
  return (
    blocks.length < MAX_SCHEDULE_BLOCKS &&
    freeModes(blocks, allowed).length > 0 &&
    blocks[i].hours >= 2 * HALF_HOUR
  );
}

/**
 * Splits a block in two halves. The first half keeps the mode and the breaks; the second gets
 * the first allowed mode no block uses yet, and no breaks.
 *
 * @returns The schedule unchanged if the block can't be split (see `canSplitBlock`).
 */
export function splitBlock(
  blocks: ScheduleBlock[],
  i: number,
  allowed: readonly StationMode[],
): ScheduleBlock[] {
  if (!canSplitBlock(blocks, i, allowed)) return blocks;
  const block = blocks[i];
  const first = Math.max(HALF_HOUR, round(block.hours / 2, HALF_HOUR));
  return [
    ...blocks.slice(0, i),
    fitBreaks({ ...block, hours: first }),
    { hours: block.hours - first, mode: freeModes(blocks, allowed)[0], breaks: [] },
    ...blocks.slice(i + 1),
  ];
}

/**
 * Removes a block; the previous one (or the next, for the first) takes its time. The station
 * stops working in that block's mode.
 *
 * @returns The schedule unchanged if it has only one block.
 */
export function removeBlock(blocks: ScheduleBlock[], i: number): ScheduleBlock[] {
  if (blocks.length < 2) return blocks;
  const j = i > 0 ? i - 1 : 1;
  const out = blocks.map((block, k) =>
    k === j ? fitBreaks({ ...block, hours: block.hours + blocks[i].hours }) : block,
  );
  out.splice(i, 1);
  return out;
}

/**
 * Rescales a schedule to a new run length, keeping the proportions as far as half hours allow.
 * Blocks that no longer fit are dropped from the end. Used when the run duration changes.
 *
 * @param blocks - The schedule.
 * @param from - The old run length, in hours.
 * @param to - The new run length, in hours.
 */
export function scaleBlocks(blocks: ScheduleBlock[], from: number, to: number): ScheduleBlock[] {
  if (blocks.length === 0 || from === to) return blocks;
  const fit = blocks.slice(0, Math.max(1, Math.floor(to / HALF_HOUR)));
  const scaled = fit.map((block) =>
    fitBreaks({
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
    scaled[index] = fitBreaks({ ...scaled[index], hours: scaled[index].hours + step });
    diff -= step;
  }
  return scaled;
}
