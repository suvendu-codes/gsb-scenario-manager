import { afterEach, describe, expect, it, vi } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";
import type { Overrides, PatchConfigBody, ScenarioConfig } from "../types";
import { applyPatchToOverrides } from "./changes";
import { createEditSession, sessionForScenario, type EditSession } from "./edit-session";
import { applyEdit, applyUndo } from "./editor-history";

const defaults = buildDefaults();
const OUTAGE = "agent.botOutagePct";
const CRITICAL = "wms.criticalPct";

const configWith = (overrides: Overrides): ScenarioConfig => ({
  scenarioId: "s-1",
  updatedAt: "t",
  runDurationHours: 8,
  defaults,
  overrides,
  issues: [],
});

/** A call to the fake server that the test answers when it chooses. */
type Call<T> = { resolve: (value: T) => void; reject: (error: Error) => void };

/**
 * A fake server: it keeps overrides like the real one, but each save and load waits until the
 * test answers it, so tests can choose the order things happen in.
 */
function fakeServer(initial: Overrides = {}) {
  let stored = initial;
  const saves: Array<Call<void> & { patch: PatchConfigBody }> = [];
  const loads: Array<Call<void>> = [];
  return {
    saves,
    loads,
    stored: () => stored,
    source: {
      save: (patch: PatchConfigBody) =>
        new Promise<ScenarioConfig>((resolve, reject) => {
          saves.push({
            patch,
            resolve: () => {
              stored = applyPatchToOverrides(defaults, stored, patch);
              resolve(configWith(stored));
            },
            reject,
          });
        }),
      load: () =>
        new Promise<ScenarioConfig>((resolve, reject) => {
          loads.push({ resolve: () => resolve(configWith(stored)), reject });
        }),
    },
  };
}

/** Lets queued promise callbacks run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const set = (session: EditSession, path: string, value: unknown) =>
  session.apply((editor) => applyEdit(editor, defaults, { set: { [path]: value } }));

const overridesOf = (session: EditSession) => session.getSnapshot().editor.overrides;
const stateOf = (session: EditSession) => session.getSnapshot().save.state;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createEditSession: saving", () => {
  it("shows an edit at once and saves edits one after another, in order", async () => {
    const server = fakeServer();
    const session = createEditSession(configWith({}), server.source);

    set(session, OUTAGE, 7);
    set(session, OUTAGE, 8);
    expect(overridesOf(session)).toEqual({ [OUTAGE]: 8 });
    expect(stateOf(session)).toBe("saving");

    await flush();
    expect(server.saves).toHaveLength(1);
    server.saves[0].resolve();
    await flush();
    expect(server.saves).toHaveLength(2);
    server.saves[1].resolve();
    await session.idle();

    expect(server.stored()).toEqual({ [OUTAGE]: 8 });
    expect(stateOf(session)).toBe("saved");
  });

  it("sends an undo made while a save is pending after that save", async () => {
    const server = fakeServer();
    const session = createEditSession(configWith({}), server.source);

    set(session, OUTAGE, 7);
    session.apply((editor) => applyUndo(editor, defaults));
    expect(overridesOf(session)).toEqual({});

    await flush();
    server.saves[0].resolve();
    await flush();
    server.saves[1].resolve();
    await session.idle();

    expect(server.saves.map((save) => save.patch)).toEqual([
      { set: { [OUTAGE]: 7 } },
      { reset: [OUTAGE] },
    ]);
    expect(server.stored()).toEqual({});
    expect(overridesOf(session)).toEqual({});
  });

  it("takes the server's overrides when they differ once nothing is queued", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const session = createEditSession(configWith({}), {
      save: async () => configWith({ [OUTAGE]: 9 }),
      load: async () => configWith({}),
    });

    set(session, OUTAGE, 7);
    await session.idle();

    expect(overridesOf(session)).toEqual({ [OUTAGE]: 9 });
    expect(session.getSnapshot().editor.undo).toEqual([]);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("stops telling a listener once it unsubscribes, and later answers do not throw", async () => {
    const server = fakeServer();
    const session = createEditSession(configWith({}), server.source);
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    set(session, OUTAGE, 7);
    const calls = listener.mock.calls.length;
    unsubscribe();
    await flush();
    server.saves[0].resolve();
    await session.idle();

    expect(listener).toHaveBeenCalledTimes(calls);
    expect(stateOf(session)).toBe("saved");
  });
});

describe("createEditSession: a failed save", () => {
  it("drops the edits queued behind it and shows what the server has", async () => {
    const server = fakeServer({ [CRITICAL]: 20 });
    const session = createEditSession(configWith({ [CRITICAL]: 20 }), server.source);

    set(session, OUTAGE, 7);
    set(session, OUTAGE, 8);
    await flush();
    server.saves[0].reject(new Error("Server down"));
    await flush();
    expect(stateOf(session)).toBe("reloading");
    server.loads[0].resolve();
    await session.idle();

    expect(server.saves).toHaveLength(1);
    expect(overridesOf(session)).toEqual({ [CRITICAL]: 20 });
    expect(session.getSnapshot().save).toEqual({ state: "error", error: "Server down" });
  });

  it("refuses edits while it reloads, so the screen and the server stay the same", async () => {
    const server = fakeServer({ [OUTAGE]: 8 });
    const session = createEditSession(configWith({ [OUTAGE]: 8 }), server.source);

    set(session, CRITICAL, 30);
    await flush();
    server.saves[0].reject(new Error("Server down"));
    await flush();

    expect(set(session, OUTAGE, 5)).toBe(false);
    expect(overridesOf(session)).toEqual({ [OUTAGE]: 8, [CRITICAL]: 30 });

    server.loads[0].resolve();
    await session.idle();
    expect(overridesOf(session)).toEqual(server.stored());
    expect(server.saves).toHaveLength(1);

    expect(set(session, OUTAGE, 6)).toBe(true);
    await flush();
    server.saves[1].resolve();
    await session.idle();
    expect(server.stored()).toEqual({ [OUTAGE]: 6 });
    expect(overridesOf(session)).toEqual(server.stored());
    expect(stateOf(session)).toBe("saved");
  });

  it("stays out of sync, refusing edits, when the reload fails too", async () => {
    const server = fakeServer();
    const session = createEditSession(configWith({}), server.source);

    set(session, OUTAGE, 7);
    await flush();
    server.saves[0].reject(new Error("Server down"));
    await flush();
    server.loads[0].reject(new Error("Still down"));
    await session.idle();

    expect(stateOf(session)).toBe("out-of-sync");
    expect(session.getSnapshot().save.error).toContain("Still down");
    expect(set(session, OUTAGE, 9)).toBe(false);

    session.reload();
    await flush();
    server.loads[1].resolve();
    await session.idle();

    expect(session.getSnapshot().save).toEqual({ state: "error", error: "Server down" });
    expect(overridesOf(session)).toEqual({});
    expect(set(session, OUTAGE, 9)).toBe(true);
  });
});

describe("sessionForScenario", () => {
  const sourceFor = () => fakeServer().source;
  const configFor = (scenarioId: string, overrides: Overrides) => ({
    ...configWith(overrides),
    scenarioId,
  });

  it("starts a session once the scenario's config has loaded, and keeps it", () => {
    expect(sessionForScenario(null, "a", undefined, sourceFor)).toBeNull();
    const session = sessionForScenario(null, "a", configFor("a", {}), sourceFor);
    expect(session?.scenarioId).toBe("a");
    expect(sessionForScenario(session, "a", configFor("a", { [OUTAGE]: 9 }), sourceFor)).toBe(
      session,
    );
  });

  it("drops the old scenario's session, its edits and its undo steps, when the id changes", () => {
    const a = sessionForScenario(null, "a", configFor("a", {}), sourceFor)!;
    set(a, OUTAGE, 7);
    expect(a.getSnapshot().editor.undo).toHaveLength(1);

    // B's config is not loaded yet: nothing is shown rather than A's state.
    expect(sessionForScenario(a, "b", configFor("a", {}), sourceFor)).toBeNull();

    const b = sessionForScenario(a, "b", configFor("b", { [CRITICAL]: 20 }), sourceFor)!;
    expect(b).not.toBe(a);
    expect(overridesOf(b)).toEqual({ [CRITICAL]: 20 });
    expect(b.getSnapshot().editor.undo).toEqual([]);
  });
});
