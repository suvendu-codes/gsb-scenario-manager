"use client";

import { useState } from "react";
import { accentColor, accentFill } from "@/components/shared/accent";
import { GROUP_HEADER_HEIGHT } from "@/components/shared/constants";
import { quickInterventions } from "@/components/shared/data";
import type { LaneAccent } from "@/components/shared/data";
import { Slider } from "@/components/ui/slider";

interface MetricsProps {
  visible: boolean;
  accent?: LaneAccent;
}

export function Metrics({ visible, accent = "amber" }: MetricsProps) {
  const [orders, setOrders] = useState([50]);
  const [windowDuration, setWindowDuration] = useState([30]);

  if (!visible) return null;

  const activeColor = accentColor[accent];
  const activeFill = accentFill[accent];

  return (
    <aside className="flex w-64 shrink-0 flex-col min-h-screen border-l border-white/10 bg-[#161A20] text-[#fff] px-3 pt-3 overflow-y-auto">
      <h2
        className="flex items-center px-1 text-[11px] font-semibold tracking-widest text-[#fff]"
        style={{ height: GROUP_HEADER_HEIGHT }}
      >
        INSPECTOR
      </h2>

      <p className="px-1 text-[11px] leading-relaxed text-[#8b8f99] pb-3">
        Click any cell in a lane to place an event at that keyframe. Click an existing marker to inspect or delete it. Events are point-in-time and snap to the 2-second grid. The run only moves forward, so anything placed behind the playhead snaps to now.
      </p>

      <div
        className="rounded-lg border bg-[var(--st-panel-2)] p-3 space-y-3 mb-4 transition-colors"
        style={{ borderColor: activeFill }}
      >
        <p className="text-[11px] leading-snug text-[var(--st-text-dim)]">
          Inject a burst of order arrivals to simulate a peak. Placed from the playhead forward.
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#8b8f99]">Orders</span>
            <span className="font-mono text-[#fff]">{orders[0]}</span>
          </div>
          <Slider
            value={orders}
            onValueChange={setOrders}
            min={5}
            max={200}
            step={5}
            accentColor={activeColor}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#8b8f99]">Window</span>
            <span className="font-mono text-[#fff]">{windowDuration[0]}s</span>
          </div>
          <Slider
            value={windowDuration}
            onValueChange={setWindowDuration}
            min={6}
            max={120}
            step={2}
            accentColor={activeColor}
          />
        </div>

        <button
          type="button"
          style={{
            backgroundColor: activeColor,
            color: accent === "amber" ? "#000" : "#fff",
          }}
          className="w-full rounded-md py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-90 active:opacity-100"
        >
          Inject burst
        </button>
      </div>

      <h2
        className="flex items-center px-1 text-[11px] font-semibold tracking-widest text-[#fff]"
        style={{ height: GROUP_HEADER_HEIGHT }}
      >
        QUICK INTERVENTIONS
      </h2>

      <div className="flex flex-col gap-2 pb-4">
        {quickInterventions.map((intervention) => (
          <button
            key={intervention}
            type="button"
            className="rounded-md border border-[var(--st-border)] px-2.5 py-1.5 text-left text-[12px] text-[var(--st-text-dim)] hover:text-[var(--st-text)] hover:bg-white/10"
          >
            {intervention}
          </button>
        ))}
      </div>


    </aside>
  );
}

export default Metrics;
