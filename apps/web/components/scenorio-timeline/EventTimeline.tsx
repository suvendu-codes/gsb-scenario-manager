"use client";

import { useMemo, useState } from "react";
import { accentColor, accentFill } from "@/components/shared/accent";
import {
  GROUP_GAP,
  GROUP_HEADER_HEIGHT,
  KEYFRAME_SECONDS,
  LANE_ROW_HEIGHT,
  MAJOR_TICK_SECONDS,
  PX_PER_SECOND,
  SCENARIO_DURATION,
} from "@/components/shared/constants";
import {
  laneEvents,
  laneGroups,
} from "@/lib/data";
import { usePlayback } from "@/components/scenorio-timeline/playback-context";
import { formatClock } from "@/components/shared/time";
import { LaneAccent, TimelineEvent, SelectedEvent } from "@/lib/types";

const TIMELINE_WIDTH = SCENARIO_DURATION * PX_PER_SECOND;
const MARKER_SIZE = 18;

function TimeRuler({ onSeek }: { onSeek: (time: number) => void }) {
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

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, Math.min(SCENARIO_DURATION, clickX / PX_PER_SECOND));
    onSeek(time);
  };

  return (
    <div
      onClick={handleRulerClick}
      className="sticky top-0 z-20 border-b border-[var(--st-border)] bg-[var(--st-bg)] cursor-pointer select-none"
      style={{ height: GROUP_HEADER_HEIGHT, width: TIMELINE_WIDTH }}
    >
      {/* Minor ticks (every 2s keyframe) */}
      {minorTicks.map((t) => (
        <span
          key={`minor-${t}`}
          className="absolute bottom-0 w-px bg-white/10 pointer-events-none"
          style={{ left: t * PX_PER_SECOND, height: 4 }}
        />
      ))}

      {/* Major ticks and labels (every 10s: 0, 10, 20, 30, 40, 50, 60...) */}
      {majorTicks.map((t) => (
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

function EventMarker({
  event,
  accent,
  onSelect,
  selected,
}: {
  event: TimelineEvent;
  accent: LaneAccent;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Event at ${formatClock(event.time)}`}
      className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border text-[10px] font-semibold text-[var(--st-text)] transition-transform hover:scale-110 cursor-pointer shadow-xs"
      style={{
        left: event.time * PX_PER_SECOND,
        width: MARKER_SIZE,
        height: MARKER_SIZE,
        borderColor: accentColor[accent],
        backgroundColor: accentFill[accent],
        outline: selected ? `2px solid ${accentColor[accent]}` : undefined,
        outlineOffset: selected ? 2 : undefined,
      }}
    >
      {event.count && event.count > 1 ? event.count : ""}
    </button>
  );
}

export function EventTimeline() {
  const { currentTime, seek } = usePlayback();
  const [selection, setSelection] = useState<SelectedEvent | null>(null);

  const majorGridTicks = useMemo(() => {
    const values: number[] = [];
    for (let t = 0; t <= SCENARIO_DURATION; t += MAJOR_TICK_SECONDS) {
      values.push(t);
    }
    return values;
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex-1 overflow-x-auto overflow-y-auto timeline-scrollbar">
        <div className="relative pt-3" style={{ width: TIMELINE_WIDTH }}>
          <TimeRuler onSeek={seek} />

          {/* Background vertical grid lines every 10s */}
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ width: TIMELINE_WIDTH }}
          >
            {majorGridTicks.map((t) => (
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
                    <li
                      key={lane.id}
                      className="relative border-t border-[var(--st-border-soft)]"
                      style={{ height: LANE_ROW_HEIGHT }}
                    >
                      {(laneEvents[lane.id] ?? []).map((event, index) => {
                        const isSelected =
                          selection?.lane.id === lane.id &&
                          selection.event.time === event.time;
                        return (
                          <EventMarker
                            key={`${lane.id}-${index}`}
                            event={event}
                            accent={group.accent}
                            selected={isSelected}
                            onSelect={() =>
                              setSelection((prev) =>
                                prev?.lane.id === lane.id &&
                                  prev.event.time === event.time
                                  ? null
                                  : {
                                    event,
                                    lane,
                                    groupLabel: group.label,
                                    accent: group.accent,
                                  }
                              )
                            }
                          />
                        );
                      })}
                    </li>
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
