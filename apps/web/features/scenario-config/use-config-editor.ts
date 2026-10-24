"use client";

import { useMemo, useRef, useState } from "react";

import { useConfigCatalog, useScenarioConfig, useUpdateScenarioConfig } from "./hooks";
import { resolveConfig } from "./paths";
import { diffToPatch } from "./state/changes";
import {
  applyEdit,
  applyRedo,
  applyUndo,
  initialEditorState,
  type EditorState,
  type EditorStep,
} from "./state/editor-history";
import type { ConfigCatalog, ConfigIssue, ConfigValues, Overrides, PatchConfigBody } from "./types";

/** Where saving stands: everything saved, a save in progress, or the last save failed. */
export type SaveStatus = { state: "saved" | "saving" | "error"; error: string | null };

/** What the config panel needs to show and change a scenario's config. */
export type ConfigEditor = {
  status: "loading" | "error" | "ready";
  error: Error | null;
  catalog: ConfigCatalog | null;
  defaults: ConfigValues | null;
  /** The changes from the defaults, as the screen currently has them. */
  overrides: Overrides;
  /** The config with the overrides applied: what the scenario will run with. */
  config: ConfigValues | null;
  /** Problems that would stop the run, as of the last save. */
  issues: ConfigIssue[];
  runDurationHours: number | null;
  save: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  /** Changes the config: `recipe` gets the current config and returns the edited one. */
  edit: (recipe: (config: ConfigValues) => ConfigValues) => void;
  /** Puts paths (or whole modules, like `"agent"`) back to their defaults. */
  reset: (paths: string[]) => void;
  undo: () => void;
  redo: () => void;
};

const NO_OVERRIDES: Overrides = {};
const NO_ISSUES: ConfigIssue[] = [];

/**
 * The state and actions of the config panel for one scenario. Edits show immediately and are
 * saved one after another in order, so a slow save can't overwrite a newer edit. If a save
 * fails, the screen goes back to what the server has and the error is reported in `save`.
 *
 * @param scenarioId - The scenario being configured.
 */
export function useConfigEditor(scenarioId: string): ConfigEditor {
  const catalogQuery = useConfigCatalog();
  const configQuery = useScenarioConfig(scenarioId);
  const update = useUpdateScenarioConfig(scenarioId);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [serverIssues, setServerIssues] = useState<ConfigIssue[] | null>(null);
  const [save, setSave] = useState<SaveStatus>({ state: "saved", error: null });

  // The latest editor state, readable right after an edit before React has re-rendered.
  const editorRef = useRef<EditorState | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  // Bumped when a save fails, so edits queued behind it are dropped.
  const generation = useRef(0);

  const data = configQuery.data;
  const state = editor ?? (data ? initialEditorState(data.overrides) : null);
  const defaults = data?.defaults ?? null;
  const overrides = state?.overrides ?? NO_OVERRIDES;
  const config = useMemo(
    () => (defaults ? resolveConfig(defaults, overrides) : null),
    [defaults, overrides],
  );

  function enqueueSave(patch: PatchConfigBody): void {
    const savedGeneration = generation.current;
    pending.current += 1;
    setSave({ state: "saving", error: null });

    queue.current = queue.current.then(async () => {
      try {
        if (savedGeneration !== generation.current) return;
        const saved = await update.mutateAsync(patch);
        setServerIssues(saved.issues);
      } catch (error) {
        generation.current += 1;
        setSave({
          state: "error",
          error: error instanceof Error ? error.message : "Could not save the change.",
        });
        const fresh = await configQuery.refetch();
        if (fresh.data) {
          const reloaded = initialEditorState(fresh.data.overrides);
          editorRef.current = reloaded;
          setEditor(reloaded);
          setServerIssues(fresh.data.issues);
        }
      } finally {
        pending.current -= 1;
        if (pending.current === 0) {
          setSave((current) =>
            current.state === "error" ? current : { state: "saved", error: null },
          );
        }
      }
    });
  }

  function commit(step: EditorStep | null): void {
    if (!step) return;
    editorRef.current = step.state;
    setEditor(step.state);
    if (step.send) enqueueSave(step.send);
  }

  function current(): EditorState | null {
    return editorRef.current ?? (data ? initialEditorState(data.overrides) : null);
  }

  const status =
    catalogQuery.isError || configQuery.isError
      ? "error"
      : catalogQuery.data && data
        ? "ready"
        : "loading";

  return {
    status,
    error: catalogQuery.error ?? configQuery.error ?? null,
    catalog: catalogQuery.data ?? null,
    defaults,
    overrides,
    config,
    issues: serverIssues ?? data?.issues ?? NO_ISSUES,
    runDurationHours: data?.runDurationHours ?? null,
    save,
    canUndo: (state?.undo.length ?? 0) > 0,
    canRedo: (state?.redo.length ?? 0) > 0,
    edit: (recipe) => {
      const base = current();
      if (!base || !defaults) return;
      const effective = resolveConfig(defaults, base.overrides);
      const patch = diffToPatch(effective, recipe(effective));
      if (patch) commit(applyEdit(base, defaults, patch));
    },
    reset: (paths) => {
      const base = current();
      if (base && defaults) commit(applyEdit(base, defaults, { reset: paths }));
    },
    undo: () => {
      const base = current();
      if (base && defaults) commit(applyUndo(base, defaults));
    },
    redo: () => {
      const base = current();
      if (base && defaults) commit(applyRedo(base, defaults));
    },
  };
}
