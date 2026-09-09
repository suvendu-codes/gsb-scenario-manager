"use client";

import { useState } from "react";

const SPEEDS = ["0.5x", "1x", "2x", "4x"];

export function Header() {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1x");

  return (
    <div className="flex items-center gap-4 border-b border-[var(--st-border)] px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--st-amber)] text-[12px] font-bold text-black">
          S
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-medium text-[var(--st-text)]">
            Peak Wave — DC-04 Sortation
          </div>
          <div className="text-[11px] text-[var(--st-text-mute)]">
            scenario · 20:00 · 2s keyframes
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPlaying((v) => !v)}
        className="rounded-md bg-[var(--st-amber)] px-4 py-1.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        aria-label="Step forward"
        className="rounded-md border border-[var(--st-border)] px-2.5 py-1.5 text-[var(--st-text-dim)] hover:text-[var(--st-text)]"
      >
        &rsaquo;
      </button>
      <button
        type="button"
        aria-label="Skip to end"
        className="rounded-md border border-[var(--st-border)] px-2.5 py-1.5 text-[var(--st-text-dim)] hover:text-[var(--st-text)]"
      >
        &raquo;
      </button>

      <div className="flex items-center gap-2 font-mono text-[15px] text-[var(--st-text)]">
        <span>00:00</span>
        <span className="text-[var(--st-text-mute)]">/ 20:00</span>
        <span className="rounded bg-[var(--st-panel-2)] px-1.5 py-0.5 text-[11px] text-[var(--st-text-dim)]">
          kf 0
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1 rounded-md border border-[var(--st-border)] p-0.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`rounded px-2 py-1 font-mono text-[12px] ${
              speed === s
                ? "bg-[var(--st-text)] text-black"
                : "text-[var(--st-text-dim)] hover:text-[var(--st-text)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="rounded-md border border-[var(--st-border)] px-3 py-1.5 text-[12px] text-[var(--st-text-dim)] hover:text-[var(--st-text)]"
      >
        ↺ Replay
      </button>
      <button
        type="button"
        className="rounded-md border border-[var(--st-border)] px-3 py-1.5 text-[12px] text-[var(--st-text-dim)] hover:text-[var(--st-text)]"
      >
        Reset scenario
      </button>
    </div>
  );
}

export default Header;
