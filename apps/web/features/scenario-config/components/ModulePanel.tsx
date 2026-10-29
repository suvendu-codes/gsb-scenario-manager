import type { ModulePanelProps } from "../panel";
import { isCustomized } from "../state/customized";
import { ConfigSections } from "./ConfigSections";
import { modulePanelStyles as styles } from "./ModulePanel.styles";
import { PanelHeader } from "./PanelHeader";

/**
 * The generic panel for one module: its header and every section of the catalog, drawn with
 * the generic field controls. Modules with composite fields (such as the data window or the
 * station schedule) have their own panel that takes over from this one.
 *
 * @param module - The module's catalog entry.
 * @param editor - The loaded config editor.
 * @param onSelect - Called with `{ area: "overview" }` when the back arrow is clicked.
 */
export function ModulePanel({ module, editor, onSelect }: ModulePanelProps): React.JSX.Element {
  return (
    <>
      <PanelHeader
        title={module.label}
        description={module.description}
        customized={isCustomized(editor.overrides, module.id)}
        onBack={() => onSelect({ area: "overview" })}
        onReset={() => editor.reset([module.id])}
        resetLabel={`Reset ${module.label} to default`}
      />
      <div className={styles.body}>
        <ConfigSections sections={module.sections} editor={editor} />
      </div>
    </>
  );
}
