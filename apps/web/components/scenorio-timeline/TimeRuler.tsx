"use client";

import React, { RefObject, useMemo } from "react";
import {
  GROUP_HEADER_HEIGHT,
  KEYFRAME_SECONDS,
  MAJOR_TICK_SECONDS,
  PX_PER_SECOND,
  SCENARIO_DURATION,
} from "@/components/shared/constants";
import { formatClock } from "@/components/shared/time";
import { useVirtualHorizontalItems } from "./use-virtual-horizontal-items";

export const TIMELINE_WIDTH = SCENARIO_DURATION * PX_PER_SECOND;

export interface TimeRulerProps {
  currentTime: number;
  onSeek: (time: number) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function TimeRuler({ currentTime, onSeek, scrollContainerRef }: TimeRulerProps) {
  const majorTicks = useMemo(() => {
    const values: number[] = [];
    for (let t = 0; t <= SCENARIO_DURATION; t += MAJOR_TICK_SECONDS) {
      values.push(t);
    }
    return values;
  }, []);

  const minorTicks = useMemo(() => {
    const values: number[] = [];
    for (let t = 0; t <= SCENARIO_DURATION; t += KEYFRAME_SECONDS) {
      if (t % MAJOR_TICK_SECONDS !== 0) {
        values.push(t);
      }
    }
    return values;
  }, []);

  const visibleMajorTicks = useVirtualHorizontalItems(
    majorTicks,
    (t) => t * PX_PER_SECOND,
    scrollContainerRef
  );

  const visibleMinorTicks = useVirtualHorizontalItems(
    minorTicks,
    (t) => t * PX_PER_SECOND,
    scrollContainerRef
  );

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, Math.min(SCENARIO_DURATION, clickX / PX_PER_SECOND));
    onSeek(time);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let nextTime = currentTime;
    if (e.key === "ArrowLeft") {
      nextTime = Math.max(0, currentTime - 1);
    } else if (e.key === "ArrowRight") {
      nextTime = Math.min(SCENARIO_DURATION, currentTime + 1);
    } else if (e.key === "PageUp") {
      nextTime = Math.max(0, currentTime - 10);
    } else if (e.key === "PageDown") {
      nextTime = Math.min(SCENARIO_DURATION, currentTime + 10);
    } else if (e.key === "Home") {
      nextTime = 0;
    } else if (e.key === "End") {
      nextTime = SCENARIO_DURATION;
    } else {
      return;
    }
    e.preventDefault();
    onSeek(nextTime);
  };

  return (
    <div
      role="slider"
      aria-label="Timeline Scrubber"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={SCENARIO_DURATION}
      aria-valuenow={currentTime}
      aria-valuetext={formatClock(currentTime)}
      onClick={handleRulerClick}
      onKeyDown={handleKeyDown}
      className="sticky top-0 z-20 border-b border-[var(--st-border)] bg-[var(--st-bg)] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--st-amber)]"
      style={{ height: GROUP_HEADER_HEIGHT, width: TIMELINE_WIDTH }}
    >
      {/* Minor ticks (every 2s keyframe) */}
      {visibleMinorTicks.map((t) => (
        <span
          key={`minor-${t}`}
          className="absolute bottom-0 w-px bg-white/10 pointer-events-none"
          style={{ left: t * PX_PER_SECOND, height: 4 }}
        />
      ))}

      {/* Major ticks and labels (every 10s: 0, 10, 20, 30, 40, 50, 60...) */}
      {visibleMajorTicks.map((t) => (
        <div
          key={`major-${t}`}
          className="absolute bottom-0 flex flex-col items-start pointer-events-none"
          style={{ left: t * PX_PER_SECOND }}
        >
          <span className="absolute -top-5 left-1 font-mono text-[11px] text-[var(--st-text-dim)] hover:text-[var(--st-text)]">
            {formatClock(t)}
          </span>
          <span className="h-2.5 w-px bg-white/30" />
        </div>
      ))}
    </div>
  );
}

export default TimeRuler;
