"use client";

import { RefObject } from "react";
import { LANE_ROW_HEIGHT, PX_PER_SECOND } from "@/components/shared/constants";
import { Lane, LaneAccent, SelectedEvent, TimelineEvent } from "@/lib/types";
import { EventMarker } from "./EventMarker";
import { useVirtualHorizontalItems } from "./use-virtual-horizontal-items";

export interface LaneRowProps {
  lane: Lane;
  events: TimelineEvent[];
  accent: LaneAccent;
  groupLabel: string;
  selection: SelectedEvent | null;
  onSelectEvent: (next: SelectedEvent | null) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function LaneRow({
  lane,
  events,
  accent,
  groupLabel,
  selection,
  onSelectEvent,
  scrollContainerRef,
}: LaneRowProps) {
  const visibleEvents = useVirtualHorizontalItems(
    events,
    (event) => event.time * PX_PER_SECOND,
    scrollContainerRef
  );

  return (
    <li
      className="relative border-t border-[var(--st-border-soft)]"
      style={{ height: LANE_ROW_HEIGHT }}
    >
      {visibleEvents.map((event) => {
        const isSelected =
          selection?.lane.id === lane.id && selection.event.time === event.time;
        return (
          <EventMarker
            key={`${lane.id}-${event.time}`}
            event={event}
            accent={accent}
            selected={isSelected}
            onSelect={() =>
              onSelectEvent(
                selection?.lane.id === lane.id && selection.event.time === event.time
                  ? null
                  : { event, lane, groupLabel, accent }
              )
            }
          />
        );
      })}
    </li>
  );
}

export default LaneRow;
