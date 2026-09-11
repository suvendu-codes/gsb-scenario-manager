"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accentColor, accentFill, ACCENTS } from "@/components/shared/accent";
import { KEYFRAME_SECONDS } from "@/components/shared/constants";

import {
  PLAYBACK_SPEEDS,
  usePlayback,
  type PlaybackSpeed,
} from "@/components/scenorio-timeline/playback-context";
import { formatClock } from "@/components/shared/time";
import { HeaderProps } from "@/lib/types";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "DES", href: "/des" },
  { label: "Emulator", href: "/emulator" },
];

export function Header({
  playing,
  onTogglePlay,
  selectedAccent = "amber",
  onSelectAccent = () => { },
  className = "",
}: HeaderProps) {
  const pathname = usePathname();
  const playback = usePlayback();

  const isPlaying = playing ?? playback.playing;
  const togglePlay = onTogglePlay ?? playback.togglePlaying;
  const speed = playback.speed;
  const setSpeed = playback.setSpeed;
  const currentTime = playback.currentTime;
  const duration = playback.duration;
  const stepForward = playback.stepForward;
  const skipToEnd = playback.skipToEnd;
  const replay = playback.replay;
  const reset = playback.reset;

  const accents = useMemo(() => ACCENTS, []);
  const activeAccent = useMemo(
    () => ({
      color: accentColor[selectedAccent],
      fill: accentFill[selectedAccent],
    }),
    [selectedAccent]
  );

  return (
    <div className={`hidden sm:flex items-center gap-4 border-b border-[var(--st-border)] px-4 py-2.5 ${className}`}>
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
            scenario · {formatClock(duration)} · {KEYFRAME_SECONDS}s keyframes
          </div>
        </div>
      </div>

      {/* Navigation tabs between Dashboard, DES, and Emulator */}
      <nav className="flex items-center gap-1 rounded-md border border-[var(--st-border)] bg-[var(--st-panel-2)] p-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${isActive
                ? "bg-[var(--st-panel)] text-[var(--st-text)] font-semibold shadow-xs"
                : "text-[var(--st-text-dim)] hover:text-[var(--st-text)] hover:bg-white/5"
                }`}
              style={
                isActive
                  ? {
                    color: activeAccent.color,
                  }
                  : undefined
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={togglePlay}
        className="rounded-md px-4 py-1.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
        style={{ backgroundColor: activeAccent.color }}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={stepForward}
        aria-label="Step forward"
        className="rounded-md border border-[var(--st-border)] px-2.5 py-1.5 text-[var(--st-text-dim)] hover:text-[var(--st-text)] active:bg-white/5"
      >
        &rsaquo;
      </button>
      <button
        type="button"
        onClick={skipToEnd}
        aria-label="Skip to end"
        className="rounded-md border border-[var(--st-border)] px-2.5 py-1.5 text-[var(--st-text-dim)] hover:text-[var(--st-text)] active:bg-white/5"
      >
        &raquo;
      </button>

      <div className="flex items-center gap-2 font-mono text-[15px] text-[var(--st-text)]">
        <span>{formatClock(currentTime)}</span>
        <span className="text-[var(--st-text-mute)]">/ {formatClock(duration)}</span>
        <span className="rounded bg-[var(--st-panel-2)] px-1.5 py-0.5 text-[11px] text-[var(--st-text-dim)]">
          kf {Math.floor(currentTime / KEYFRAME_SECONDS)}
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

      {/* Speed Controls */}
      <div className="flex items-center gap-1 rounded-md border border-[var(--st-border)] p-0.5">
        {PLAYBACK_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s as PlaybackSpeed)}
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
        onClick={replay}
        className="rounded-md border border-[var(--st-border)] px-3 py-1.5 text-[12px] text-[var(--st-text-dim)] hover:text-[var(--st-text)] active:bg-white/5"
      >
        ↺ Replay
      </button>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-[var(--st-border)] px-3 py-1.5 text-[12px] text-[var(--st-text-dim)] hover:text-[var(--st-text)] active:bg-white/5"
      >
        Reset scenario
      </button>
    </div>
  );
}

export default Header;
