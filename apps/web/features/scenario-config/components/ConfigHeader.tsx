import { ArrowLeft, Redo2, Undo2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/features/scenarios/components/StatusPill";
import type { ScenarioStatus } from "@/features/scenarios/types";

import type { SaveState, SaveStatus } from "../use-config-editor";
import { configHeaderStyles as styles } from "./ConfigHeader.styles";

type ConfigHeaderProps = {
  scenarioId: string;
  scenarioName: string;
  status: ScenarioStatus;
  /** "Project · Map", shown above the name. */
  context: string;
  save: SaveStatus;
  /** False while a failed save is being recovered from; undo and redo are off then. */
  editable: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

const SAVE_TEXT: Record<SaveState, string> = {
  saved: "Saves automatically",
  saving: "Saving…",
  reloading: "Reloading…",
  error: "Couldn’t save",
  "out-of-sync": "Not in sync",
};

/**
 * The top of the config screen: back to setup, the scenario's name and status, whether the
 * latest change is saved, undo and redo, and the Run button (which is not available yet).
 *
 * @param scenarioId - The scenario id.
 * @param scenarioName - The scenario's name.
 * @param status - The scenario's status.
 * @param context - The project and map names.
 * @param save - Whether changes are saved.
 * @param editable - Whether edits are accepted right now.
 * @param canUndo - Whether there is an edit to undo.
 * @param canRedo - Whether there is an edit to redo.
 * @param onUndo - Called when Undo is clicked.
 * @param onRedo - Called when Redo is clicked.
 */
export function ConfigHeader({
  scenarioId,
  scenarioName,
  status,
  context,
  save,
  editable,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ConfigHeaderProps): React.JSX.Element {
  return (
    <header className={styles.root}>
      <Link
        href={`/scenarios/${encodeURIComponent(scenarioId)}/setup`}
        className={styles.back}
        aria-label="Back to setup"
      >
        <ArrowLeft className={styles.backIcon} aria-hidden="true" />
      </Link>
      <div className={styles.titles}>
        <p className={styles.crumb}>{context}</p>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{scenarioName}</h1>
          <StatusPill status={status} />
        </div>
      </div>
      <div className={styles.actions}>
        <span
          className={cn(
            styles.save,
            (save.state === "error" || save.state === "out-of-sync") && styles.saveError,
          )}
          role="status"
          title={save.error ?? undefined}
        >
          {SAVE_TEXT[save.state]}
        </span>
        <div className={styles.history}>
          <button
            type="button"
            className={styles.historyButton}
            aria-label="Undo"
            disabled={!editable || !canUndo}
            onClick={onUndo}
          >
            <Undo2 className={styles.historyIcon} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.historyButton}
            aria-label="Redo"
            disabled={!editable || !canRedo}
            onClick={onRedo}
          >
            <Redo2 className={styles.historyIcon} aria-hidden="true" />
          </button>
        </div>
        <Button className={styles.run} disabled title="Running a scenario is not available yet">
          Run emulation
        </Button>
      </div>
    </header>
  );
}
