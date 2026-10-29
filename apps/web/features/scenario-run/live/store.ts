"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";

import { startSession, type RunSession } from "./session";

/**
 * Keeps each scenario's run session in sessionStorage, so the clock, pauses and live changes
 * survive a reload in this tab. Nothing is sent anywhere.
 *
 * Known limitation of the mock: the session is per tab. "Open live run" in a new tab, or after
 * the tab was closed, starts the clock from 0h again, whatever the run's state on the server.
 * A real run screen would read the run's progress from the emulation instead.
 */

/** A stored session, checked before use: one from an older build or a bad write is dropped. */
const storedSessionSchema = z.object({
  scenarioId: z.string(),
  startedAt: z.number(),
  pausedAt: z.number().nullable(),
  pausedMs: z.number(),
  stoppedAtH: z.number().nullable(),
  changes: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("station"),
        atH: z.number(),
        stationId: z.string(),
        on: z.boolean(),
      }),
      z.object({ kind: z.literal("bots"), atH: z.number(), bots: z.number() }),
    ]),
  ),
});
const KEY = (scenarioId: string) => `scenario-run:${scenarioId}`;
const listeners = new Set<() => void>();
const cache = new Map<string, RunSession | null>();

/** A stored session, or null when it can't be read or doesn't have today's shape. */
export function parseStoredSession(raw: string): RunSession | null {
  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function read(scenarioId: string): RunSession | null {
  if (cache.has(scenarioId)) return cache.get(scenarioId) ?? null;
  let session: RunSession | null = null;
  try {
    const raw = window.sessionStorage.getItem(KEY(scenarioId));
    session = raw ? parseStoredSession(raw) : null;
  } catch {
    session = null;
  }
  cache.set(scenarioId, session);
  return session;
}

/** Saves a session (or forgets it with null) and tells the screens. */
export function saveSession(scenarioId: string, session: RunSession | null): void {
  cache.set(scenarioId, session);
  try {
    if (session) window.sessionStorage.setItem(KEY(scenarioId), JSON.stringify(session));
    else window.sessionStorage.removeItem(KEY(scenarioId));
  } catch {
    // Storage can be unavailable (private mode); the session still lives in memory.
  }
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * The run session of a scenario, and a way to change it. Null until the run is started here.
 *
 * @param scenarioId - The scenario.
 */
export function useRunSession(
  scenarioId: string,
): [RunSession | null, (update: (session: RunSession) => RunSession) => void, () => void] {
  const session = useSyncExternalStore(
    subscribe,
    () => read(scenarioId),
    () => null,
  );
  // Stable for a scenario, so effects that depend on them (the loading timer) don't restart.
  const update = useCallback(
    (change: (current: RunSession) => RunSession) => {
      const current = read(scenarioId);
      if (current) saveSession(scenarioId, change(current));
    },
    [scenarioId],
  );
  const start = useCallback(
    () => saveSession(scenarioId, startSession(scenarioId, Date.now())),
    [scenarioId],
  );
  return [session, update, start];
}

/** The current time, updated every second while `active`, so the run screen moves. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}
