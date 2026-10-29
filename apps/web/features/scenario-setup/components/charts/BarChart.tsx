"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { barChartStyles as styles } from "./BarChart.styles";

const WIDTH = 280;
const HEIGHT = 96;
const PAD_X = 6;
const PAD_TOP = 8;
const LABEL_HEIGHT = 14;
const MAX_BAR_WIDTH = 24;
const LABEL_EVERY_HOURS = 4;

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** A column with a rounded top and a square base, drawn as a path. */
function columnPath(x: number, y: number, width: number, height: number): string {
  const radius = Math.min(2, width / 2, height);
  return [
    `M${x},${y + height}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + width - radius},${y}`,
    `Q${x + width},${y} ${x + width},${y + radius}`,
    `L${x + width},${y + height}`,
    "Z",
  ].join(" ");
}

type BarChartProps = {
  /** One value per hour of the day (24 values). */
  values: number[];
  /** What the chart shows, for screen readers and the table, for example "Inbound units by hour". */
  label: string;
  /** What one unit of a value is, shown in the tooltip, for example "units". */
  unit: string;
  /** Tailwind `fill-*` class that colours the bars. */
  barClassName: string;
};

/**
 * Column chart of a value per hour of the day, drawn with SVG.
 * Hovering a column (or moving with the arrow keys once the chart has focus) shows its hour
 * and value. Screen readers get the same numbers as a table. The busiest hour is stated
 * under the chart instead of labelling every bar.
 *
 * @param values - 24 values, one per hour.
 * @param label - What the chart shows.
 * @param unit - The unit shown in the tooltip.
 * @param barClassName - Tailwind `fill-*` class for the bars.
 */
export function BarChart({ values, label, unit, barClassName }: BarChartProps): React.JSX.Element {
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...values, 0);
  const plotHeight = HEIGHT - PAD_TOP - LABEL_HEIGHT;
  const slot = (WIDTH - PAD_X * 2) / values.length;
  const barWidth = Math.min(slot * 0.68, MAX_BAR_WIDTH);
  const peakHour = max > 0 ? values.indexOf(max) : null;

  const barHeight = (value: number): number => (max > 0 ? (value / max) * plotHeight : 0);
  const barX = (hour: number): number => PAD_X + hour * slot + (slot - barWidth) / 2;

  function handleKeyDown(event: React.KeyboardEvent): void {
    const last = values.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: active === null ? 0 : Math.min(last, active + 1),
      ArrowLeft: active === null ? last : Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  if (max === 0) return <p className={styles.empty}>No data in this file.</p>;

  const tooltipX = active === null ? 0 : ((barX(active) + barWidth / 2) / WIDTH) * 100;
  const tooltipY =
    active === null ? 0 : ((PAD_TOP + plotHeight - barHeight(values[active])) / HEIGHT) * 100;

  return (
    <div>
      <div
        className={styles.root}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Use the left and right arrow keys to read each hour.`}
        onKeyDown={handleKeyDown}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.svg} aria-hidden="true">
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={PAD_TOP + plotHeight}
            y2={PAD_TOP + plotHeight}
            className={styles.baseline}
            strokeWidth={1}
          />
          {values.map((value, hour) => (
            <g key={hour}>
              <path
                d={columnPath(
                  barX(hour),
                  PAD_TOP + plotHeight - barHeight(value),
                  barWidth,
                  barHeight(value),
                )}
                className={cn(styles.bar, barClassName)}
                opacity={active === null || active === hour ? 1 : 0.55}
              />
              <rect
                x={PAD_X + hour * slot}
                y={0}
                width={slot}
                height={HEIGHT - LABEL_HEIGHT}
                fill="transparent"
                onPointerEnter={() => setActive(hour)}
                onPointerMove={() => setActive(hour)}
              />
            </g>
          ))}
          {values.map((_, hour) =>
            hour % LABEL_EVERY_HOURS === 0 ? (
              <text
                key={hour}
                x={PAD_X + hour * slot + slot / 2}
                y={HEIGHT - 2}
                textAnchor="middle"
                className={styles.axisLabel}
              >
                {hourLabel(hour)}
              </text>
            ) : null,
          )}
        </svg>

        {active !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: `clamp(36px, ${tooltipX}%, calc(100% - 36px))`,
              top: `calc(${tooltipY}% - 4px)`,
            }}
          >
            <span className={styles.tooltipValue}>
              {values[active].toLocaleString("en-US")} {unit}
            </span>
            {hourLabel(active)}–{hourLabel((active + 1) % 24)}
          </div>
        )}
      </div>

      {peakHour !== null && (
        <p className={styles.peak}>
          Peak {max.toLocaleString("en-US")} {unit} at {hourLabel(peakHour)}
        </p>
      )}

      <table className={styles.tableOnly}>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {values.map((value, hour) => (
            <tr key={hour}>
              <th scope="row">{hourLabel(hour)}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
