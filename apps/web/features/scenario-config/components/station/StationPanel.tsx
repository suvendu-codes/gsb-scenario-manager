import { cn } from "@/lib/utils";

import { ALL_STATIONS, type ModulePanelProps } from "../../panel";
import { isCustomized } from "../../state/customized";
import { ConfigSections } from "../ConfigSections";
import { PanelHeader } from "../PanelHeader";
import { isStationCustomized, resetStation } from "./field-edits";
import { SchedulerWeights } from "./SchedulerWeights";
import { StationDetails } from "./StationDetails";
import { StationPicker } from "./StationPicker";
import { StationSection } from "./StationSection";
import { stationPanelStyles as styles } from "./StationPanel.styles";
import { buildStationView, type StationSectionRenderer } from "./station-view";

/** What the station panel is given: the usual panel props, plus bodies for the sections it can't draw itself. */
export type StationPanelProps = ModulePanelProps & {
  /**
   * Draws the body of a section by section id: the schedule and the operations, which need
   * editors of their own. Without one, those sections are left out.
   */
  sectionRenderers?: Record<string, StationSectionRenderer>;
};

/**
 * The Station Config panel. Its station list switches between the All-stations view (site-wide
 * settings, then the schedule, structure and operations shared by the stations an edit reaches)
 * and one station's view (its own schedule, structure, hardware, operations and registry details).
 *
 * @param module - The station module's catalog entry.
 * @param editor - The loaded config editor.
 * @param selection - Which station is being edited, or all of them.
 * @param onSelect - Called to open another station or return to the overview.
 * @param sectionRenderers - Bodies for the sections that have their own editor.
 */
export function StationPanel({
  module: stationModule,
  editor,
  selection,
  onSelect,
  sectionRenderers,
}: StationPanelProps): React.JSX.Element {
  const view = buildStationView(editor, selection, onSelect);
  const info = editor.stations.find((station) => station.id === view.station);

  const sections = stationModule.sections.filter((section) =>
    view.isAll ? section.scope !== "singleStation" : section.scope !== "allStations",
  );
  const siteWide = sections.filter((section) => section.scope === "allStations");
  const perStation = sections.filter((section) => section.scope !== "allStations");

  const customized = view.isAll
    ? isCustomized(editor.overrides, stationModule.id)
    : isStationCustomized(editor.config, editor.overrides, view.station);

  return (
    <>
      <PanelHeader
        title={view.isAll ? "All stations" : (info?.label ?? view.station)}
        description={view.isAll ? stationModule.description : info?.registryType}
        customized={customized}
        onBack={() => onSelect({ area: "overview" })}
        onReset={() =>
          view.isAll
            ? editor.reset([stationModule.id])
            : editor.edit((config) => resetStation(config, editor.defaults, view.station))
        }
        resetLabel={
          view.isAll ? "Reset all stations to default" : `Reset ${view.station} to default`
        }
      />
      <div className={styles.body}>
        <StationPicker
          stations={editor.stations}
          value={view.isAll ? ALL_STATIONS : view.station}
          note={view.isAll ? "Errors and the pick scheduler apply to every station." : undefined}
          onSelect={onSelect}
        />
        {siteWide.length > 0 && (
          <ConfigSections
            sections={siteWide}
            editor={editor}
            renderers={{
              weights: (context) => <SchedulerWeights context={context} editor={editor} />,
            }}
          />
        )}
        <div
          className={cn(
            styles.stationSections,
            siteWide.length > 0 && styles.stationSectionsAfterGlobal,
          )}
        >
          {editor.stations.length === 0 && (
            <p className={styles.empty}>This map has no stations in the site registry.</p>
          )}
          {editor.stations.length > 0 &&
            perStation.map((section) => {
              const render = sectionRenderers?.[section.id];
              if (render) {
                return (
                  <StationSection key={section.id} section={section} view={view}>
                    {render(section, view)}
                  </StationSection>
                );
              }
              // Schedule and operations have no generic body; skip them until a renderer is given.
              if (section.fieldsFrom || section.fields.some((field) => field.type === "schedule")) {
                return null;
              }
              return <StationSection key={section.id} section={section} view={view} />;
            })}
          {!view.isAll && info && <StationDetails station={info} />}
        </div>
      </div>
    </>
  );
}
