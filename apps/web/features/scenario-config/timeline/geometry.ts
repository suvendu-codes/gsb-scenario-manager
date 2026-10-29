/**
 * The clock hour the run starts at. The design draws the run from 08:00; the API has no run
 * start yet, so it is fixed here until it does (open question).
 */
export const RUN_START_HOUR = 8;

/** Where an hour into the run sits across the timeline, as a percentage (0 at the start). */
export function hourToPct(offsetHours: number, runHours: number): number {
  return runHours > 0 ? (offsetHours / runHours) * 100 : 0;
}

/** A clock time such as `08:00` or `13:30`; hours past midnight wrap to the next day. */
export function clockLabel(clockHour: number): string {
  const total = Math.round(clockHour * 60);
  const minutes = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** The ruler above each lane: a label every hour (`0h` … `8h`) and a dot every quarter hour. */
export type Ruler = {
  hours: Array<{ offset: number; pct: number; label: string }>;
  dots: number[];
};

/** The ruler of a run of this length. */
export function ruler(runHours: number): Ruler {
  const hours = Array.from({ length: Math.floor(runHours) + 1 }, (_, h) => ({
    offset: h,
    pct: hourToPct(h, runHours),
    label: `${h}h`,
  }));
  const dots: number[] = [];
  for (let q = 1; q < runHours * 4; q++) {
    if (q % 4 !== 0) dots.push(hourToPct(q / 4, runHours));
  }
  return { hours, dots };
}
