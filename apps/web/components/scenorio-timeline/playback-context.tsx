"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { KEYFRAME_SECONDS, SCENARIO_DURATION } from "@/components/shared/constants";
import { PlaybackSpeed, PlaybackContextValue } from "@/lib/types";

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = ["0.5x", "1x", "2x", "4x"] as const;
export type { PlaybackSpeed, PlaybackContextValue };

const SPEED_MULTIPLIER: Record<PlaybackSpeed, number> = {
  "0.5x": 0.5,
  "1x": 1,
  "2x": 2,
  "4x": 4,
};

const TICK_MS = 200;

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>("1x");
  const [currentTime, setCurrentTime] = useState(0);
  const duration = SCENARIO_DURATION;

  useEffect(() => {
    if (!playing) return;
    const multiplier = SPEED_MULTIPLIER[speed];
    const id = setInterval(() => {
      setCurrentTime((time) => {
        const nextTime = time + (TICK_MS / 1000) * multiplier;
        if (nextTime >= duration) {
          setPlaying(false);
          return duration;
        }
        return nextTime;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, speed, duration]);

  const togglePlaying = useCallback(() => setPlaying((v) => !v), []);
  const stepForward = useCallback(() => {
    setCurrentTime((time) => Math.min(duration, time + KEYFRAME_SECONDS));
  }, [duration]);
  const skipToEnd = useCallback(() => setCurrentTime(duration), [duration]);
  const replay = useCallback(() => {
    setCurrentTime(0);
    setPlaying(true);
  }, []);
  const reset = useCallback(() => {
    setCurrentTime(0);
    setPlaying(false);
  }, []);
  const seek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(duration, time)));
  }, [duration]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      playing,
      speed,
      currentTime,
      duration,
      togglePlaying,
      setSpeed,
      stepForward,
      skipToEnd,
      replay,
      reset,
      seek,
    }),
    [playing, speed, currentTime, duration, togglePlaying, stepForward, skipToEnd, replay, reset, seek]
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }
  return ctx;
}
