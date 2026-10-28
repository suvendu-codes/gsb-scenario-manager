"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { MapRef } from "./api";
import { scenarioConfigSource, useConfigCatalog, useMapStations, useScenarioConfig } from "./hooks";
import { resolveConfig } from "./paths";
import { stationsInConfig } from "./stations";
import { diffToPatch } from "./state/changes";
import {
  sessionForScenario,
  type EditSession,
  type SaveStatus,
  type SessionSnapshot,
} from "./state/edit-session";
import { applyEdit, applyRedo, applyUndo } from "./state/editor-history";
import type { ConfigCatalog, ConfigIssue, ConfigValues, Overrides } from "./types";
import type { MapStation } from "./upstream/stations";

export type { SaveState, SaveStatus } from "./state/edit-session";

/** What the config panel needs to show and change a scenario's config. */
export type ConfigEditor = {
  status: "loading" | "error" | "ready";
  error: Error | null;
  catalog: ConfigCatalog | null;
  /**
   * The scenario's stations, in the config's order, with their registry details from the map
   * (unknown details when the map's PPS lookup failed or lacks a station).
   */
  stations: MapStation[];
  defaults: ConfigValues | null;
  /** The changes from the defaults, as the screen currently has them. */
  overrides: Overrides;
  /** The config with the overrides applied: what the scenario will run with. */
  config: ConfigValues | null;
  /** Problems that would stop the run, as of the last answer from the server. */
  issues: ConfigIssue[];
  runDurationHours: number | null;
  save: SaveStatus;
  /** False while a failed save is being recovered from; edits are ignored then. */
  editable: boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** Changes the config: `recipe` gets the current config and returns the edited one. */
  edit: (recipe: (config: ConfigValues) => ConfigValues) => void;
  /** Puts paths (or whole modules, like `"agent"`) back to their defaults. */
  reset: (paths: string[]) => void;
  undo: () => void;
  redo: () => void;
  /** Loads what the server has again, when saving is `out-of-sync`. */
  reload: () => void;
};

const NO_OVERRIDES: Overrides = {};
const NO_ISSUES: ConfigIssue[] = [];
const NO_STATIONS: MapStation[] = [];
const noSubscription = () => () => {};
const noSnapshot = () => null;

/**
 * The state and actions of the config panel for one scenario. Saving, failure recovery and
 * undo live in an edit session (`state/edit-session.ts`); this hook starts one per scenario,
 * so changing `scenarioId` never shows or sends another scenario's edits.
 *
 * @param scenarioId - The scenario being configured.
 * @param map - The scenario's project and map, for the station details.
 */
export function useConfigEditor(scenarioId: string, map: MapRef): ConfigEditor {
  const queryClient = useQueryClient();
  const catalogQuery = useConfigCatalog();
  const configQuery = useScenarioConfig(scenarioId);
  const stationsQuery = useMapStations(map);
  const data = configQuery.data;

  // One session per scenario: a new scenario drops the old one with all its state.
  const [session, setSession] = useState<EditSession | null>(null);
  const live = sessionForScenario(session, scenarioId, data, (id) =>
    scenarioConfigSource(queryClient, id),
  );
  if (live !== session) setSession(live);

  const snapshot: SessionSnapshot | null = useSyncExternalStore(
    live?.subscribe ?? noSubscription,
    live?.getSnapshot ?? noSnapshot,
    live?.getSnapshot ?? noSnapshot,
  );

  const defaults = data?.defaults ?? null;
  const overrides = snapshot?.editor.overrides ?? NO_OVERRIDES;
  const config = useMemo(
    () => (defaults ? resolveConfig(defaults, overrides) : null),
    [defaults, overrides],
  );
  const save = snapshot?.save ?? { state: "saved", error: null };
  const lookup = stationsQuery.data?.stations;
  const stations = useMemo(
    () => (defaults ? stationsInConfig(defaults, lookup ?? NO_STATIONS) : NO_STATIONS),
    [defaults, lookup],
  );

  // A failed refetch keeps the loaded data; only a load that never succeeded is an error.
  // (A failed reload after a failed save shows as the `out-of-sync` save state instead.)
  const loadFailed = (catalogQuery.isError && !catalogQuery.data) || (configQuery.isError && !data);
  // The station details wait for their lookup, but a failed lookup is not an error: the config
  // says which stations exist, and they are shown with unknown details.
  const status = loadFailed
    ? "error"
    : catalogQuery.data && live && !stationsQuery.isPending
      ? "ready"
      : "loading";

  return {
    status,
    error: loadFailed ? (catalogQuery.error ?? configQuery.error) : null,
    catalog: catalogQuery.data ?? null,
    stations,
    defaults,
    overrides,
    config,
    issues: snapshot?.issues ?? NO_ISSUES,
    runDurationHours: data?.runDurationHours ?? null,
    save,
    editable: save.state !== "reloading" && save.state !== "out-of-sync",
    canUndo: (snapshot?.editor.undo.length ?? 0) > 0,
    canRedo: (snapshot?.editor.redo.length ?? 0) > 0,
    edit: (recipe) => {
      if (!defaults) return;
      live?.apply((editor) => {
        const effective = resolveConfig(defaults, editor.overrides);
        const patch = diffToPatch(effective, recipe(effective));
        return patch ? applyEdit(editor, defaults, patch) : null;
      });
    },
    reset: (paths) => {
      if (defaults) live?.apply((editor) => applyEdit(editor, defaults, { reset: paths }));
    },
    undo: () => {
      if (defaults) live?.apply((editor) => applyUndo(editor, defaults));
    },
    redo: () => {
      if (defaults) live?.apply((editor) => applyRedo(editor, defaults));
    },
    reload: () => live?.reload(),
  };
}
