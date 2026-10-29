import type { ConfigValues } from "../types";
import { clockLabel, hourToPct } from "./geometry";

type Wms = ConfigValues["wms"];

/**
 * Outbound order lines per clock hour (24 values) as the run replays them: the dataset's hourly
 * profile reshaped as the design does (flatline: the mean every hour; Pareto: weighted to the
 * peak hours; staggered: alternating high and low hours), scaled by the volume multiplier, and
 * zero outside the data window.
 *
 * @param hourly - The outbound dataset's lines per hour, if it has a profile.
 * @param wms - The WMS settings.
 * @returns The profile, or null when the dataset has none.
 */
export function outboundProfile(hourly: readonly number[] | undefined, wms: Wms): number[] | null {
  if (!hourly || hourly.length !== 24) return null;
  const mean = hourly.reduce((sum, value) => sum + value, 0) / 24;
  const peak = Math.max(...hourly, 1);
  return hourly.map((value, hour) => {
    const shaped =
      wms.outboundDistribution === "flatline"
        ? mean
        : wms.outboundDistribution === "pareto"
          ? (value / peak) ** 2 * peak * 1.4
          : wms.outboundDistribution === "staggered"
            ? value * (hour % 2 ? 0.6 : 1.35)
            : value;
    const inWindow = hour >= wms.dataWindow.startHour && hour < wms.dataWindow.endHour;
    return inWindow ? shaped * wms.volumeMultiplier : 0;
  });
}

/**
 * Order lines released between two clock hours: each hour's lines times the share of that hour
 * inside the span, so spans that don't start on the hour add up exactly. Rounded.
 */
export function linesBetween(
  profile: readonly number[],
  fromClock: number,
  toClock: number,
): number {
  let sum = 0;
  for (let hour = Math.floor(fromClock); hour < toClock; hour++) {
    const overlap = Math.min(toClock, hour + 1) - Math.max(fromClock, hour);
    if (overlap > 0) sum += profile[((hour % 24) + 24) % 24] * overlap;
  }
  return Math.round(sum);
}

/** A release block on the WMS lane: one wave, or the whole run when streaming. */
export type ReleaseBlock = {
  label: string;
  from: number;
  hours: number;
  leftPct: number;
  widthPct: number;
  /** Order lines released in it; null without a dataset profile. */
  lines: number | null;
};

/**
 * The release blocks of the run: `waves` equal waves, or one streaming block.
 *
 * @param wms - The WMS settings.
 * @param runHours - Length of the run.
 * @param startHour - Clock hour the run starts at.
 * @param profile - Order lines per clock hour, or null.
 */
export function releaseBlocks(
  wms: Wms,
  runHours: number,
  startHour: number,
  profile: readonly number[] | null,
): ReleaseBlock[] {
  const lines = (from: number, hours: number) =>
    profile ? linesBetween(profile, startHour + from, startHour + from + hours) : null;
  if (wms.release.pattern === "streaming") {
    return [
      {
        label: "Streaming · continuous release",
        from: 0,
        hours: runHours,
        leftPct: 0,
        widthPct: 100,
        lines: lines(0, runHours),
      },
    ];
  }
  const count = Math.max(1, wms.release.waves);
  const hours = runHours / count;
  return Array.from({ length: count }, (_, i) => ({
    label: `Wave ${i + 1}`,
    from: i * hours,
    hours,
    leftPct: hourToPct(i * hours, runHours),
    widthPct: hourToPct(hours, runHours),
    lines: lines(i * hours, hours),
  }));
}

/** The order cutoff on the WMS lane: a marker inside the run, or a note at its edge. */
export type CutoffMarker =
  { where: "inside"; pct: number; label: string } | { where: "before" | "after"; label: string };

/** Where the cutoff hour falls relative to the run. */
export function cutoffMarker(
  cutoffHour: number,
  startHour: number,
  runHours: number,
): CutoffMarker {
  const label = `Cutoff ${clockLabel(cutoffHour)}`;
  const offset = cutoffHour - startHour;
  if (offset < 0) return { where: "before", label: `${label} · before run start` };
  if (offset > runHours) return { where: "after", label: `${label} · after run end` };
  return { where: "inside", pct: hourToPct(offset, runHours), label };
}
