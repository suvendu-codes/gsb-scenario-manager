import { renderOperationsSection } from "../operations/OperationsEditor";
import { renderScheduleSection } from "../schedule/ScheduleEditor";
import { StationPanel, type StationPanelProps } from "./StationPanel";

const SECTION_RENDERERS = {
  schedule: renderScheduleSection,
  operations: renderOperationsSection,
};

/**
 * The Station Config panel with all its editors: the station panel with the schedule and
 * operations editors plugged in.
 *
 * @param props - The usual module panel props.
 */
export function ConfiguredStationPanel(
  props: Omit<StationPanelProps, "sectionRenderers">,
): React.JSX.Element {
  return <StationPanel {...props} sectionRenderers={SECTION_RENDERERS} />;
}
