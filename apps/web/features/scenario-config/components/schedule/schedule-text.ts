import type { ScheduleBlock, StationMode } from "../../types";

/** Labels of the station modes, as the panel shows them. */
export const MODE_LABELS: Record<StationMode, string> = {
  pick: "Pick",
  put: "Put",
  audit: "Audit",
};

/** Hours as short text: `4h`, `1.5h`. */
export function formatHours(hours: number): string {
  return `${Number(hours.toFixed(2))}h`;
}

/** The span of a block, such as `0h – 4h`. */
export function formatRange(start: number, hours: number): string {
  return `${formatHours(start)} – ${formatHours(start + hours)}`;
}

/** The total length of a schedule with its number of blocks, such as `2 blocks · 8h`. */
export function scheduleTotal(blocks: ScheduleBlock[]): string {
  const hours = blocks.reduce((sum, block) => sum + block.hours, 0);
  return `${blocks.length} ${blocks.length === 1 ? "block" : "blocks"} · ${formatHours(hours)}`;
}

/** An id for a new break. */
export function newBreakId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `t${random.replaceAll("-", "").slice(0, 8)}`;
}
