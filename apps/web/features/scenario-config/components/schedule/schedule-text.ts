import type { ScheduleBlock } from "../../types";

/** Labels of the station modes, as the panel shows them. */
export const MODE_LABELS: Record<ScheduleBlock["mode"], string> = {
  pick: "Pick",
  put: "Put",
  audit: "Audit",
  off: "Off",
};

/** Hours as short text: `4h`, `1.5h`. */
export function formatHours(hours: number): string {
  return `${Number(hours.toFixed(2))}h`;
}

/** The span of a period, such as `0h – 4h`. */
export function formatRange(start: number, hours: number): string {
  return `${formatHours(start)} – ${formatHours(start + hours)}`;
}

/** The total length of a schedule with its number of periods, such as `2 periods · 8h`. */
export function scheduleTotal(blocks: ScheduleBlock[]): string {
  const hours = blocks.reduce((sum, block) => sum + block.hours, 0);
  return `${blocks.length} ${blocks.length === 1 ? "period" : "periods"} · ${formatHours(hours)}`;
}

/** A schedule in a line, such as `Pick 4h · Put 4h`. */
export function scheduleSummary(blocks: ScheduleBlock[]): string {
  return blocks
    .map((block) => `${MODE_LABELS[block.mode]} ${formatHours(block.hours)}`)
    .join(" · ");
}

/** An id for a new tea break. */
export function newTeaId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `t${random.replaceAll("-", "").slice(0, 8)}`;
}
