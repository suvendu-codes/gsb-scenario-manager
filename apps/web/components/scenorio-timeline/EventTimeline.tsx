"use client";

import { useMemo, useRef, useState } from "react";
import {
  GROUP_GAP,
  GROUP_HEADER_HEIGHT,
  MAJOR_TICK_SECONDS,
  PX_PER_SECOND,
  SCENARIO_DURATION,
} from "@/components/shared/constants";
import {
  laneEvents,
  laneGroups,
} from "@/lib/data";
import { usePlayback } from "@/components/scenorio-timeline/playback-context";
import { SelectedEvent } from "@/lib/types";
import { TimeRuler, TIMELINE_WIDTH } from "./TimeRuler";
import { LaneRow } from "./LaneRow";
import { useVirtualHorizontalItems } from "./use-virtual-horizontal-items";

export function EventTimeline() {
  const { currentTime, seek } = usePlayback();
  const [selection, setSelection] = useState<SelectedEvent | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const majorGridTicks = useMemo(() => {
    const values: number[] = [];
    for (let t = 0; t <= SCENARIO_DURATION; t += MAJOR_TICK_SECONDS) {
      values.push(t);
    }
    return values;
  }, []);

  const visibleGridTicks = useVirtualHorizontalItems(
    majorGridTicks,
    (t) => t * PX_PER_SECOND,
    scrollContainerRef
  );

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-auto timeline-scrollbar"
      >
        <div className="relative pt-3" style={{ width: TIMELINE_WIDTH }}>
          <TimeRuler
            currentTime={currentTime}
            onSeek={seek}
            scrollContainerRef={scrollContainerRef}
          />

          {/* Background vertical grid lines every 10s */}
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ width: TIMELINE_WIDTH }}
          >
            {visibleGridTicks.map((t) => (
              <div
                key={`grid-${t}`}
                className="absolute top-0 bottom-0 w-px bg-white/[0.04]"
                style={{ left: t * PX_PER_SECOND }}
              />
            ))}
          </div>

          {/* Playhead vertical line and top scrubber */}
          <div
            className="pointer-events-none absolute top-3 bottom-0 z-30 w-px bg-[var(--st-coral)]"
            style={{ left: currentTime * PX_PER_SECOND }}
          >
            <span className="absolute -top-1 left-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[var(--st-coral)] shadow-sm" />
          </div>

          {/* Lanes and events */}
          <div className="relative z-10 flex flex-col" style={{ gap: GROUP_GAP }}>
            {laneGroups.map((group) => (
              <section key={group.id}>
                <div style={{ height: GROUP_HEADER_HEIGHT }} />
                <ul className="flex flex-col">
                  {group.lanes.map((lane) => (
                    <LaneRow
                      key={lane.id}
                      lane={lane}
                      events={laneEvents[lane.id] ?? []}
                      accent={group.accent}
                      groupLabel={group.label}
                      selection={selection}
                      onSelectEvent={setSelection}
                      scrollContainerRef={scrollContainerRef}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventTimeline;
