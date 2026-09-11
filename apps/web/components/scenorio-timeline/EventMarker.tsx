"use client";

import React from "react";
import { accentColor, accentFill } from "@/components/shared/accent";
import { PX_PER_SECOND } from "@/components/shared/constants";
import { formatClock } from "@/components/shared/time";
import { LaneAccent, TimelineEvent } from "@/lib/types";

export const MARKER_SIZE = 18;

export interface EventMarkerProps {
  event: TimelineEvent;
  accent: LaneAccent;
  onSelect: () => void;
  selected: boolean;
}

export function EventMarker({
  event,
  accent,
  onSelect,
  selected,
}: EventMarkerProps) {
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

export default EventMarker;
