"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { startSession, type RunSession } from "./session";

/**
 * Keeps each scenario's run session in sessionStorage, so the clock, pauses and live changes
 * survive a reload in this tab. Nothing is sent anywhere.
 */
const KEY = (scenarioId: string) => `scenario-run:${scenarioId}`;
const listeners = new Set<() => void>();
const cache = new Map<string, RunSession | null>();

function read(scenarioId: string): RunSession | null {
  if (cache.has(scenarioId)) return cache.get(scenarioId) ?? null;
  let session: RunSession | null = null;
  try {
    const raw = window.sessionStorage.getItem(KEY(scenarioId));
    session = raw ? (JSON.parse(raw) as RunSession) : null;
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
  const update = (change: (current: RunSession) => RunSession) => {
    const current = read(scenarioId);
    if (current) saveSession(scenarioId, change(current));
  };
  const start = () => saveSession(scenarioId, startSession(scenarioId, Date.now()));
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
