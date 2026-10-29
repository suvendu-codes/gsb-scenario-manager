import { deepEqual } from "../paths";
import type { ConfigIssue, PatchConfigBody, ScenarioConfig } from "../types";
import { initialEditorState, type EditorState, type EditorStep } from "./editor-history";

/**
 * Where saving stands:
 * - `saved`: the server has everything on screen.
 * - `saving`: edits are on their way, in order.
 * - `reloading`: a save failed; the screen is being replaced with what the server has. Edits
 *   are refused until that is done.
 * - `error`: a save failed and the screen now shows what the server has. Editing can go on.
 * - `out-of-sync`: a save failed and so did the reload, so the screen may not match the server.
 *   Edits are refused until `reload` succeeds.
 */
export type SaveState = "saved" | "saving" | "reloading" | "error" | "out-of-sync";

/** Where saving stands, with the reason when something went wrong. */
export type SaveStatus = { state: SaveState; error: string | null };

/** What a session shows: the overrides being edited with their history, the issues, saving. */
export type SessionSnapshot = {
  editor: EditorState;
  /** Problems that would stop the run, as of the last answer from the server. */
  issues: ConfigIssue[];
  save: SaveStatus;
};

/** How a session talks to the server for its scenario. */
export type SessionSource = {
  save: (patch: PatchConfigBody) => Promise<ScenarioConfig>;
  load: () => Promise<ScenarioConfig>;
};

/** One scenario's editing session; see `createEditSession`. */
export type EditSession = {
  readonly scenarioId: string;
  getSnapshot: () => SessionSnapshot;
  /** Listens for changes; returns the function that stops listening. */
  subscribe: (listener: () => void) => () => void;
  /**
   * Applies a history step built from the current editor state and queues its patch.
   *
   * @returns False when edits are refused (while reloading or out of sync), true otherwise.
   */
  apply: (build: (editor: EditorState) => EditorStep | null) => boolean;
  /** Loads what the server has again, after a reload failed. Does nothing otherwise. */
  reload: () => void;
  /** A promise that settles once every queued save (and any reload) is done. For tests. */
  idle: () => Promise<void>;
};

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Starts editing a scenario's config. Edits show at once and their patches are sent one after
 * another, so a slow save can't overwrite a newer edit.
 *
 * When a save fails, the edits queued behind it are dropped, edits are refused while the
 * session reloads what the server has, and the screen is replaced with it. If that reload fails
 * too, the session stays `out-of-sync` (still refusing edits) until `reload` succeeds.
 *
 * When the last queued save is answered, the server's overrides are compared with the screen's.
 * If the server normalised them differently, its version is taken (with a fresh history, since
 * the old undo steps were built on the other version) and the mismatch is logged.
 *
 * A session belongs to one scenario; make a new one for another scenario. Answers that arrive
 * after every listener has gone only update the session itself.
 *
 * @param initial - The config as loaded.
 * @param source - Saves a patch and loads the config, for this scenario.
 */
export function createEditSession(initial: ScenarioConfig, source: SessionSource): EditSession {
  let snapshot: SessionSnapshot = {
    editor: initialEditorState(initial.overrides),
    issues: initial.issues,
    save: { state: "saved", error: null },
  };
  const listeners = new Set<() => void>();
  let queue: Promise<void> = Promise.resolve();
  let pending = 0;
  // Bumped when a save fails, so the saves queued behind it are dropped.
  let generation = 0;
  let lastServer: ScenarioConfig | null = null;
  // Why the last save failed, kept for the message after a later reload succeeds.
  let saveError = "";

  function update(next: Partial<SessionSnapshot>): void {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  }

  const refusesEdits = () =>
    snapshot.save.state === "reloading" || snapshot.save.state === "out-of-sync";

  async function reloadFromServer(): Promise<void> {
    const error = saveError;
    update({ save: { state: "reloading", error } });
    try {
      const fresh = await source.load();
      lastServer = fresh;
      update({
        editor: initialEditorState(fresh.overrides),
        issues: fresh.issues,
        save: { state: "error", error },
      });
    } catch (reloadError) {
      update({
        save: {
          state: "out-of-sync",
          error: `${error} Reloading what the server has failed too: ${messageOf(reloadError, "unknown error")}`,
        },
      });
    }
  }

  /** Takes the server's overrides if they differ from the screen's once nothing is queued. */
  function reconcile(): void {
    if (!lastServer || deepEqual(lastServer.overrides, snapshot.editor.overrides)) return;
    console.warn("The server normalised the config differently; showing its version.", {
      screen: snapshot.editor.overrides,
      server: lastServer.overrides,
    });
    update({ editor: initialEditorState(lastServer.overrides) });
  }

  function enqueue(patch: PatchConfigBody): void {
    const queuedGeneration = generation;
    pending += 1;
    update({ save: { state: "saving", error: null } });

    queue = queue.then(async () => {
      try {
        if (queuedGeneration !== generation) return;
        const saved = await source.save(patch);
        if (queuedGeneration !== generation) return;
        lastServer = saved;
        update({ issues: saved.issues });
      } catch (error) {
        generation += 1;
        saveError = messageOf(error, "Could not save the change.");
        await reloadFromServer();
      } finally {
        pending -= 1;
        if (pending === 0 && snapshot.save.state === "saving") {
          reconcile();
          update({ save: { state: "saved", error: null } });
        }
      }
    });
  }

  return {
    scenarioId: initial.scenarioId,
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    apply: (build) => {
      if (refusesEdits()) return false;
      const step = build(snapshot.editor);
      if (!step) return true;
      update({ editor: step.state });
      if (step.send) enqueue(step.send);
      return true;
    },
    reload: () => {
      if (snapshot.save.state !== "out-of-sync") return;
      queue = queue.then(reloadFromServer);
    },
    idle: () => queue,
  };
}

/**
 * The session to use for a scenario: the current one if it is for that scenario, a new one once
 * that scenario's config has loaded, and none until then. So after the scenario changes, the
 * old scenario's overrides, issues and undo steps are never shown or sent.
 *
 * @param current - The session in use, if any.
 * @param scenarioId - The scenario on screen now.
 * @param loaded - The loaded config, which may still be another scenario's.
 * @param sourceFor - Makes the save/load source for a scenario.
 */
export function sessionForScenario(
  current: EditSession | null,
  scenarioId: string,
  loaded: ScenarioConfig | undefined,
  sourceFor: (scenarioId: string) => SessionSource,
): EditSession | null {
  if (current?.scenarioId === scenarioId) return current;
  if (loaded?.scenarioId !== scenarioId) return null;
  return createEditSession(loaded, sourceFor(scenarioId));
}
