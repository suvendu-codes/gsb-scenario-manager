import type { ModulePanelProps } from "../../panel";
import { isCustomized } from "../../state/customized";
import { ConfigSections } from "../ConfigSections";
import { PanelHeader } from "../PanelHeader";
import { agentPanelStyles as styles } from "./AgentPanel.styles";
import { FleetCards } from "./FleetCards";

/**
 * The Agent panel: the fleet as one card per bot type with its picture, then bot outage and
 * charging, drawn from the catalog.
 *
 * @param module - The Agent module's catalog entry.
 * @param editor - The loaded config editor.
 * @param onSelect - Called with `{ area: "overview" }` when the back arrow is clicked.
 */
export function AgentPanel({
  module: agent,
  editor,
  onSelect,
}: ModulePanelProps): React.JSX.Element {
  return (
    <>
      <PanelHeader
        title={agent.label}
        description={agent.description}
        customized={isCustomized(editor.overrides, agent.id)}
        onBack={() => onSelect({ area: "overview" })}
        onReset={() => editor.reset([agent.id])}
        resetLabel={`Reset ${agent.label} to default`}
      />
      <div className={styles.body}>
        <ConfigSections
          sections={agent.sections}
          editor={editor}
          customSections={{ fleet: () => <FleetCards editor={editor} /> }}
        />
      </div>
    </>
  );
}
