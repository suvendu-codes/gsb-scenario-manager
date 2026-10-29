"use client";

import type { ConfigEditor } from "../use-config-editor";
import { isReady, type ModulePanels, type PanelSelection } from "../panel";
import { configPanelStyles as styles } from "./ConfigPanel.styles";
import { ModulePanel } from "./ModulePanel";
import { OverviewPanel } from "./OverviewPanel";

type ConfigPanelProps = {
  scenarioId: string;
  editor: ConfigEditor;
  selection: PanelSelection;
  onSelect: (selection: PanelSelection) => void;
  /** Panels that replace the generic module panel, by module id. */
  panels?: ModulePanels;
};

/**
 * The right-hand config panel: the overview, or the panel of the selected module. While the
 * config loads it shows a message, and another if it could not be loaded.
 *
 * @param scenarioId - The scenario being configured.
 * @param editor - The config editor.
 * @param selection - What to show.
 * @param onSelect - Called when the user opens or leaves a module.
 * @param panels - Module panels to use instead of the generic one.
 */
export function ConfigPanel({
  scenarioId,
  editor,
  selection,
  onSelect,
  panels,
}: ConfigPanelProps): React.JSX.Element {
  if (!isReady(editor)) {
    const failed = editor.status === "error";
    return (
      <aside className={styles.root} aria-label="Scenario config" aria-busy={!failed}>
        <div className={styles.message} role={failed ? "alert" : "status"}>
          <p className={styles.messageTitle}>
            {failed ? "Couldn’t load the config" : "Loading the config…"}
          </p>
          {failed && <p className={styles.messageText}>{editor.error?.message}</p>}
        </div>
      </aside>
    );
  }

  const selected =
    selection.area === "overview"
      ? undefined
      : editor.catalog.modules.find((candidate) => candidate.id === selection.area);
  const Panel = selected ? (panels?.[selected.id] ?? ModulePanel) : null;

  return (
    <aside className={styles.root} aria-label="Scenario config">
      {selected && Panel ? (
        <Panel module={selected} editor={editor} selection={selection} onSelect={onSelect} />
      ) : (
        <OverviewPanel scenarioId={scenarioId} editor={editor} onSelect={onSelect} />
      )}
    </aside>
  );
}
