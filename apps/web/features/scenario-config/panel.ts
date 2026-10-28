import type { ComponentType, ReactNode } from "react";

import type { ConfigEditor } from "./use-config-editor";
import type { CatalogField, CatalogModule, ConfigCatalog, ConfigValues, ModuleId } from "./types";

/** The `station` value that means "all stations" in a panel selection. */
export const ALL_STATIONS = "all";

/**
 * What the right-hand panel shows: the overview, or one module. The station module shows all
 * stations (`station: ALL_STATIONS`), one station type (`stationType`), or one station.
 */
export type PanelSelection =
  | { area: "overview" }
  | { area: "wms" }
  | { area: "agent" }
  | { area: "station"; station: string }
  | { area: "station"; stationType: string };

/** A config editor whose data has loaded, so nothing in it is null. */
export type ReadyConfigEditor = ConfigEditor & {
  catalog: ConfigCatalog;
  defaults: ConfigValues;
  config: ConfigValues;
  runDurationHours: number;
};

/** True once the catalog and the scenario config have both loaded. */
export function isReady(editor: ConfigEditor): editor is ReadyConfigEditor {
  return (
    editor.status === "ready" &&
    editor.catalog !== null &&
    editor.defaults !== null &&
    editor.config !== null &&
    editor.runDurationHours !== null
  );
}

/** What a panel for one module is given. */
export type ModulePanelProps = {
  module: CatalogModule;
  editor: ReadyConfigEditor;
  selection: PanelSelection;
  onSelect: (selection: PanelSelection) => void;
};

/** Panels that replace the generic one for a module, by module id. */
export type ModulePanels = Partial<Record<ModuleId, ComponentType<ModulePanelProps>>>;

/** Everything a field control needs about one field. */
export type FieldContext = {
  /** The field with its `{stationId}` paths filled in. */
  field: CatalogField;
  path: string;
  value: unknown;
  defaultValue: unknown;
  /** True when the value differs from its default. */
  changed: boolean;
  config: ConfigValues;
  write: (value: unknown) => void;
  reset: () => void;
};

/** The field types that have no generic control; a panel supplies a renderer for the ones it uses. */
export type CompositeRenderers = Partial<
  Record<"dataWindow" | "weights" | "schedule", (context: FieldContext) => ReactNode>
>;
