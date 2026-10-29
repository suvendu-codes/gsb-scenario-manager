import { isCustomized } from "../../state/customized";
import type { StationView } from "../station/station-view";
import { operationPath, setOperationValue, type OperationMode } from "./operation-edits";

/** Which stations an operations edit changes, and the panel view it comes from. */
export type OperationsContext = {
  view: StationView;
  /** The stations written to: the one station, or every station of the type. */
  targets: string[];
};

/** Builds the context for a station panel view. */
export function operationsContextFor(view: StationView): OperationsContext {
  return {
    view,
    targets: view.isGroup ? view.group : [view.station],
  };
}

/**
 * What a control for one pick or audit setting needs: its current value (the shown station's),
 * whether any targeted station differs from the default, and how to change or reset it.
 *
 * @param context - The operations context.
 * @param mode - `pick` or `audit`.
 * @param key - The setting.
 */
export function bindingFor(context: OperationsContext, mode: OperationMode, key: string) {
  const { editor, referenceId } = context.view;
  const paths = context.targets.map((id) => operationPath(id, mode, key));
  return {
    value: editor.config.station.stations[referenceId].operations[mode][key],
    changed: paths.some((path) => isCustomized(editor.overrides, path)),
    write: (value: string | boolean) =>
      editor.edit((config) => setOperationValue(config, context.targets, mode, key, value)),
    reset: () => editor.reset(paths),
  };
}
