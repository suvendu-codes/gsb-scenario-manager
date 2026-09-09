"use client";

import { useMemo, useState } from "react";

import { accentColor, accentFill } from "@/components/shared/accent";
import {
  GROUP_GAP,
  GROUP_HEADER_HEIGHT,
  LANE_ROW_HEIGHT,
  MAJOR_TICK_SECONDS,
  PX_PER_SECOND,
  SCENARIO_DURATION,
} from "@/components/shared/constants";
import { laneEvents, laneGroups, type Lane, type LaneAccent, type TimelineEvent } from "@/components/shared/data";
import { usePlayback } from "@/components/shared/playback-context";
import { formatClock } from "@/components/shared/time";

interface SelectedEvent {
  event: TimelineEvent;
  lane: Lane;
  groupLabel: string;
  accent: LaneAccent;
}

const TIMELINE_WIDTH = SCENARIO_DURATION * PX_PER_SECOND;
const MARKER_SIZE = 18;

function TimeRuler() {
  const ticks = useMemo(() => {
    const values: number[] = [];
    for (let t = 0; t <= SCENARIO_DURATION; t += MAJOR_TICK_SECONDS) {
      values.push(t);
    }
    return values;
  }, []);

  return (
    <div
      className="sticky top-0 z-10 border-b border-[var(--st-border)] bg-[var(--st-bg)]"
      style={{ height: GROUP_HEADER_HEIGHT, width: TIMELINE_WIDTH }}
    >
      {ticks.map((t) => (
        <span
          key={t}
          className="absolute top-1/2 -translate-y-1/2 font-mono text-[11px] text-[var(--st-text-dim)]"
          style={{ left: t * PX_PER_SECOND + 4 }}
        >
          {formatClock(t)}
        </span>
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
      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border text-[10px] font-semibold text-[var(--st-text)] transition-transform hover:scale-110"
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

function EventInspector({ selection, onClose }: { selection: SelectedEvent | null; onClose: () => void }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3 border-l border-[var(--st-border)] bg-[var(--st-panel)] p-4">
      <h2 className="text-[11px] font-semibold tracking-widest text-[var(--st-text)]">
        SHOW EVENTS
      </h2>

      {!selection ? (
        <p className="text-[12px] leading-relaxed text-[var(--st-text-dim)]">
          Click any event marker in the timeline to inspect it.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-md border border-[var(--st-border)] bg-[var(--st-panel-2)] p-3">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm border"
              style={{
                borderColor: accentColor[selection.accent],
                backgroundColor: accentFill[selection.accent],
              }}
            />
            <span className="text-[13px] font-medium text-[var(--st-text)]">
              {selection.lane.label}
            </span>
          </div>
          <div className="text-[11px] text-[var(--st-text-mute)]">{selection.groupLabel}</div>
          <dl className="grid grid-cols-2 gap-y-1.5 pt-1 text-[12px]">
            <dt className="text-[var(--st-text-dim)]">Time</dt>
            <dd className="text-right font-mono text-[var(--st-text)]">
              {formatClock(selection.event.time)}
            </dd>
            <dt className="text-[var(--st-text-dim)]">Occurrences</dt>
            <dd className="text-right font-mono text-[var(--st-text)]">
              {selection.event.count ?? 1}
            </dd>
          </dl>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 self-start rounded-md border border-[var(--st-border)] px-2.5 py-1 text-[11px] text-[var(--st-text-dim)] hover:text-[var(--st-text)]"
          >
            Clear selection
          </button>
        </div>
      )}
    </aside>
  );
}

export function EventTimeline() {
  const { currentTime } = usePlayback();
  const [selection, setSelection] = useState<SelectedEvent | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="relative pt-3" style={{ width: TIMELINE_WIDTH }}>
          <TimeRuler />

          <div
            className="pointer-events-none absolute top-3 bottom-0 z-10 w-px bg-[var(--st-coral)]"
            style={{ left: currentTime * PX_PER_SECOND }}
          >
            <span className="absolute -top-1 left-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--st-coral)]" />
          </div>

          <div className="flex flex-col" style={{ gap: GROUP_GAP }}>
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
                      {(laneEvents[lane.id] ?? []).map((event, index) => (
                        <EventMarker
                          key={`${lane.id}-${index}`}
                          event={event}
                          accent={group.accent}
                          selected={selection?.lane.id === lane.id && selection.event.time === event.time}
                          onSelect={() =>
                            setSelection({ event, lane, groupLabel: group.label, accent: group.accent })
                          }
                        />
                      ))}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>

      <EventInspector selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}

export default EventTimeline;
