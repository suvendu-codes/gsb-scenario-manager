"use client";

import EventTimeline from "@/components/scenorio-timeline/EventTimeline";
import { PlaybackProvider } from "@/components/scenorio-timeline/playback-context";

export default function EmulatorPage() {
  return (
    <PlaybackProvider>
      <EventTimeline />
    </PlaybackProvider>
  );
}
