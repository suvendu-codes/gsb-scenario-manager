"use client";

import { useMemo, useState } from "react";
import { accentColor, accentFill, ACCENTS } from "@/components/shared/accent";
import type { LaneAccent } from "@/components/shared/data";

const SPEEDS = ["0.5x", "1x", "2x", "4x"];

interface HeaderProps {
  playing: boolean;
  onTogglePlay: () => void;
  selectedAccent?: LaneAccent;
  onSelectAccent?: (accent: LaneAccent) => void;
}

export function Header({
  playing,
  onTogglePlay,
  selectedAccent = "amber",
  onSelectAccent = () => { },
}: HeaderProps) {
  const [speed, setSpeed] = useState("1x");
  const accents = useMemo(() => ACCENTS, []);
  const activeAccent = useMemo(
    () => ({
      color: accentColor[selectedAccent],
      fill: accentFill[selectedAccent],
    }),
    [selectedAccent]
  );

  return (
    <div className="flex items-center gap-4 border-b border-[var(--st-border)] px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-bold border transition-colors"
          style={{
            backgroundColor: activeAccent.fill,
            borderColor: activeAccent.color,
            color: activeAccent.color,
          }}
        >
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
        onClick={onTogglePlay}
        className="rounded-md px-4 py-1.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
        style={{ backgroundColor: activeAccent.color }}
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

      {/* Accent Button Group */}
      <div className="flex items-center gap-1 rounded-md border border-[var(--st-border)] bg-[var(--st-panel-2)] p-0.5">
        {accents.map((accent) => {
          const isSelected = selectedAccent === accent;
          return (
            <button
              key={accent}
              type="button"
              title={accent}
              aria-label={`${accent} accent`}
              onClick={() => onSelectAccent(accent)}
              className={`flex h-6 w-6 items-center justify-center rounded border transition-all ${isSelected
                ? "shadow-xs"
                : "border-transparent opacity-70 hover:opacity-100 hover:bg-white/5"
                }`}
              style={
                isSelected
                  ? {
                    backgroundColor: accentFill[accent],
                    borderColor: accentColor[accent],
                  }
                  : undefined
              }
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: accentColor[accent] }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 rounded-md border border-[var(--st-border)] p-0.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`rounded px-2 py-1 font-mono text-[12px] ${speed === s
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
