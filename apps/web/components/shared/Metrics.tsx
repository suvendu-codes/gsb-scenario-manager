"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { accentColor, accentFill } from "@/components/shared/accent";
import { GROUP_HEADER_HEIGHT } from "@/components/shared/constants";
import { quickInterventions } from "@/lib/data";
import { Slider } from "@/components/ui/slider";
import { FaSquare } from "react-icons/fa";
import { MetricsProps } from "@/lib/types";

export function Metrics({ visible = true, accent = "amber" }: MetricsProps) {
  const pathname = usePathname();
  const isOrderManagement = pathname?.includes("order-management");

  const [orders, setOrders] = useState([50]);
  const [windowDuration, setWindowDuration] = useState([30]);

  // If on other routes and visible is false, do not render
  if (!isOrderManagement && !visible) return null;

  const activeColor = accentColor[accent];
  const activeFill = accentFill[accent];

  // If order-management route, show WAVE PLAN PREVIEW
  if (isOrderManagement) {
    return (
      <aside className="flex w-64 shrink-0 flex-col min-h-screen border-l border-white/10 bg-[#161A20] text-[#fff] px-3 pt-3 overflow-y-auto">
        <div
          className="flex items-center justify-between px-1"
          style={{ height: GROUP_HEADER_HEIGHT }}
        >
          <h2 className="text-[11px] font-semibold tracking-widest text-[#fff]">
            WAVE PLAN PREVIEW
          </h2>
          <span className="flex items-center gap-1.5 rounded-full bg-[rgba(63,155,125,0.15)] border border-[rgba(63,155,125,0.3)] px-2 py-0.5 text-[10px] font-mono text-[var(--st-teal)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--st-teal)] animate-pulse" />
            online
          </span>
        </div>

        <p className="px-1 text-[11px] leading-relaxed text-[#8b8f99] pb-3">
          Step 6 · computed live, recalculates as categories/inventory change
        </p>

        {/* Live Metrics Summary Card */}
        <div
          className="rounded-lg border bg-[var(--st-panel-2)] p-3 space-y-3 mb-4 transition-colors"
          style={{ borderColor: activeFill }}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[11px] text-[var(--st-text-dim)] uppercase tracking-wider">
                wave
              </span>
              <span className="font-mono text-[13px] font-semibold text-[var(--st-text)]">
                23 orders/wave
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[11px] text-[var(--st-text-dim)] uppercase tracking-wider">
                total
              </span>
              <span
                className="font-mono text-[13px] font-semibold transition-colors"
                style={{ color: activeColor }}
              >
                23 orders this run
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[11px] text-[var(--st-text-dim)] uppercase tracking-wider">
                lines
              </span>
              <span className="font-mono text-[13px] font-semibold text-[var(--st-text)]">
                4-5 per order
              </span>
            </div>
          </div>

          {/* Pareto Distribution Box */}
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-2.5 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--st-text-dim)]">
              SKU Distribution
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--st-amber)] font-medium">SKUs 1-2 (60%)</span>
              <span className="text-[var(--st-text-mute)] font-sans">→</span>
              <span className="text-[var(--st-teal)] font-semibold">100% of orders</span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Else show existing Inspector Metrics
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
            <span className="font-mono font-medium transition-colors" style={{ color: activeColor }}>
              {orders[0]}
            </span>
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
            <span className="font-mono font-medium transition-colors" style={{ color: activeColor }}>
              {windowDuration[0]}s
            </span>
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
          className="w-full rounded-md py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-90 active:opacity-100 cursor-pointer"
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
            className="group flex items-center gap-2.5 rounded-md border border-[var(--st-border)] px-2.5 py-1.5 text-left text-[12px] text-[var(--st-text-dim)] transition-all hover:text-[var(--st-text)] hover:bg-white/10 hover:border-white/20 active:scale-[0.99] cursor-pointer"
          >
            <FaSquare
              className="size-3.5 shrink-0 transition-colors"
              style={{
                color: activeColor,
                fill: activeFill,
              }}
            />
            <span className="flex-1 truncate transition-colors group-hover:text-[var(--st-text)]">
              {intervention}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default Metrics;
