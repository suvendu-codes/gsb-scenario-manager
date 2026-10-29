import type { LiveChange, RunControl } from "./types";

/**
 * A run being watched in this browser: when its warehouse clock started, pauses, a stop, and
 * the user's live changes. It holds no metrics; the engine computes those from it.
 */
export type RunSession = {
  scenarioId: string;
  /** Real time the clock started, in milliseconds. */
  startedAt: number;
  /** Real time it was paused, while paused. */
  pausedAt: number | null;
  /** Real milliseconds spent paused before the current pause. */
  pausedMs: number;
  stoppedAtH: number | null;
  changes: LiveChange[];
};

/** How fast the warehouse clock runs: one real second is one warehouse minute. */
export const WAREHOUSE_HOURS_PER_SECOND = 1 / 60;

/** A session whose clock starts now. */
export function startSession(scenarioId: string, now: number): RunSession {
  return { scenarioId, startedAt: now, pausedAt: null, pausedMs: 0, stoppedAtH: null, changes: [] };
}

/** Hours into the run on the warehouse clock, at most the run length. */
export function hoursAt(session: RunSession, runHours: number, now: number): number {
  if (session.stoppedAtH !== null) return session.stoppedAtH;
  const until = session.pausedAt ?? now;
  const elapsed = Math.max(0, until - session.startedAt - session.pausedMs) / 1000;
  return Math.min(runHours, elapsed * WAREHOUSE_HOURS_PER_SECOND);
}

/** What the engine needs from a session at a moment. */
export function controlAt(session: RunSession, runHours: number, now: number): RunControl {
  return {
    nowH: hoursAt(session, runHours, now),
    stoppedAtH: session.stoppedAtH,
    paused: session.pausedAt !== null,
    changes: session.changes,
  };
}

/** Freezes the warehouse clock. */
export function pause(session: RunSession, now: number): RunSession {
  return session.pausedAt === null && session.stoppedAtH === null
    ? { ...session, pausedAt: now }
    : session;
}

/** Starts the clock again where it stopped. */
export function resume(session: RunSession, now: number): RunSession {
  if (session.pausedAt === null) return session;
  return { ...session, pausedAt: null, pausedMs: session.pausedMs + (now - session.pausedAt) };
}

/** Ends the run early, at the current hour. It can't be resumed. */
export function stop(session: RunSession, runHours: number, now: number): RunSession {
  if (session.stoppedAtH !== null) return session;
  return { ...session, stoppedAtH: hoursAt(session, runHours, now), pausedAt: null };
}

/** Records a live change at the current hour. */
export function addChange(
  session: RunSession,
  change: LiveChangeInput,
  runHours: number,
  now: number,
): RunSession {
  const atH = hoursAt(session, runHours, now);
  return { ...session, changes: [...session.changes, { ...change, atH }] };
}

/** A live change as the user makes it; the session stamps it with the hour. */
export type LiveChangeInput =
  { kind: "station"; stationId: string; on: boolean } | { kind: "bots"; bots: number };
