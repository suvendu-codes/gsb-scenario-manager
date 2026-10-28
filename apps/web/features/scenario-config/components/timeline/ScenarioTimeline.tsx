import type { PanelSelection, ReadyConfigEditor } from "../../panel";
import { AgentsCard } from "./AgentsCard";
import { scenarioTimelineStyles as styles } from "./ScenarioTimeline.styles";
import { WmsCard } from "./WmsCard";

type ScenarioTimelineProps = {
  editor: ReadyConfigEditor;
  /** The outbound dataset's lines per hour, if it has a profile. */
  outboundHourly: readonly number[] | undefined;
  selection: PanelSelection;
  onSelect: (selection: PanelSelection) => void;
};

/**
 * The timeline on the left of the config screen: what each module does over the run. Each card
 * opens its settings in the panel, and the card whose settings are open is outlined, so the two
 * sides stay in step.
 */
export function ScenarioTimeline({
  editor,
  outboundHourly,
  selection,
  onSelect,
}: ScenarioTimelineProps): React.JSX.Element {
  return (
    <section className={styles.root} aria-label="Scenario timeline">
      <WmsCard
        editor={editor}
        outboundHourly={outboundHourly}
        selected={selection.area === "wms"}
        onOpen={() => onSelect({ area: "wms" })}
      />
      <AgentsCard
        editor={editor}
        selected={selection.area === "agent"}
        onOpen={() => onSelect({ area: "agent" })}
      />
    </section>
  );
}
