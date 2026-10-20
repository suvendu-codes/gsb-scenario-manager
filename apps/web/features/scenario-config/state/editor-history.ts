import { deepEqual } from "../paths";
import type { ConfigValues, Overrides, PatchConfigBody } from "../types";
import { applyPatchToOverrides, inversePatch } from "./changes";

/** How many edits can be undone. */
const MAX_HISTORY = 100;

/** An edit and the patch that reverses it. */
export type HistoryEntry = { forward: PatchConfigBody; inverse: PatchConfigBody };

/** The overrides being edited, with the edits that can be undone and redone. */
export type EditorState = {
  overrides: Overrides;
  undo: HistoryEntry[];
  redo: HistoryEntry[];
};

/** What to do after a history step: the new state, and the patch to save (null if nothing). */
export type EditorStep = { state: EditorState; send: PatchConfigBody | null };

/** Starts editing from the overrides the server returned, with no history. */
export function initialEditorState(overrides: Overrides): EditorState {
  return { overrides, undo: [], redo: [] };
}

/**
 * Records a new edit. It can be undone, and it clears whatever could have been redone.
 *
 * @param state - The editor state before the edit.
 * @param defaults - The scenario's default config.
 * @param patch - The edit.
 * @returns The new state and the patch to save; `send` is null when the edit changes nothing.
 */
export function applyEdit(
  state: EditorState,
  defaults: ConfigValues,
  patch: PatchConfigBody,
): EditorStep {
  const overrides = applyPatchToOverrides(defaults, state.overrides, patch);
  if (deepEqual(overrides, state.overrides)) return { state, send: null };

  const entry: HistoryEntry = { forward: patch, inverse: inversePatch(state.overrides, patch) };
  return {
    state: { overrides, undo: [...state.undo, entry].slice(-MAX_HISTORY), redo: [] },
    send: patch,
  };
}

/**
 * Undoes the latest edit.
 *
 * @returns The new state and the patch to save, or null when there is nothing to undo.
 */
export function applyUndo(state: EditorState, defaults: ConfigValues): EditorStep | null {
  const entry = state.undo[state.undo.length - 1];
  if (!entry) return null;
  return {
    state: {
      overrides: applyPatchToOverrides(defaults, state.overrides, entry.inverse),
      undo: state.undo.slice(0, -1),
      redo: [...state.redo, entry],
    },
    send: entry.inverse,
  };
}

/**
 * Redoes the latest undone edit.
 *
 * @returns The new state and the patch to save, or null when there is nothing to redo.
 */
export function applyRedo(state: EditorState, defaults: ConfigValues): EditorStep | null {
  const entry = state.redo[state.redo.length - 1];
  if (!entry) return null;
  return {
    state: {
      overrides: applyPatchToOverrides(defaults, state.overrides, entry.forward),
      undo: [...state.undo, entry],
      redo: state.redo.slice(0, -1),
    },
    send: entry.forward,
  };
}
