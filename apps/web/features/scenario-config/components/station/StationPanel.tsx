"use client";

import { useId, useState } from "react";

import { ALL_STATIONS, type ModulePanelProps } from "../../panel";
import { stationTypes } from "../../station-types";
import { isCustomized } from "../../state/customized";
import { ConfigSections } from "../ConfigSections";
import { PanelHeader } from "../PanelHeader";
import { isStationCustomized, resetStation } from "./field-edits";
import { SchedulerWeights } from "./SchedulerWeights";
import { StationDetails } from "./StationDetails";
import { StationPicker, typeValue } from "./StationPicker";
import { StationSection } from "./StationSection";
import { tabOf, type StationTabId } from "./station-tabs";
import { StationTabs } from "./StationTabs";
import { stationPanelStyles as styles } from "./StationPanel.styles";
import { buildStationView, type StationSectionRenderer, type StationView } from "./station-view";
import { isTypeCustomized, StationTypeList } from "./StationTypeList";

/** What the station panel is given: the usual panel props, plus bodies for the sections it can't draw itself. */
export type StationPanelProps = ModulePanelProps & {
  /**
   * Draws the body of a section by section id: the schedule and the operations, which need
   * editors of their own. Without one, those sections are left out.
   */
  sectionRenderers?: Record<string, StationSectionRenderer>;
};

/** The picker value for a view. */
function pickerValue(view: StationView): string {
  if (view.kind === "type" && view.type) return typeValue(view.type.id);
  return view.kind === "station" ? view.station : ALL_STATIONS;
}

/**
 * The Stations panel, for all stations, one station type, or one station:
 * - all stations: the site-wide settings, then the station types to open;
 * - a type: its schedule, setup and operations, in the design's three tabs, edited for its
 *   stations together (stations that keep their own schedule or structure are skipped);
 * - a station: the same tabs for the station alone, with its registry details under setup.
 *
 * @param module - The station module's catalog entry.
 * @param editor - The loaded config editor.
 * @param selection - What is shown.
 * @param onSelect - Called to open a type or station, or return to the summary.
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
  const [tab, setTab] = useState<StationTabId>("modes");
  const panelId = useId();
  const types = stationTypes(editor.stations);
  const info = editor.stations.find((station) => station.id === view.station);

  const sections = stationModule.sections.filter((section) =>
    view.kind === "all"
      ? section.scope === "allStations"
      : section.scope !== "allStations" &&
        (view.kind === "station" || section.scope !== "singleStation"),
  );

  const customized =
    view.kind === "all"
      ? isCustomized(editor.overrides, stationModule.id)
      : view.kind === "type" && view.type
        ? isTypeCustomized(editor, view.type)
        : isStationCustomized(editor.config, editor.overrides, view.station, view.group);

  const title =
    view.kind === "all"
      ? "All station configs"
      : view.kind === "type"
        ? (view.type?.label ?? "")
        : (info?.label ?? view.station);
  const description =
    view.kind === "all"
      ? "Settings for every station. Modes, schedule, setup and operations are set per type."
      : view.kind === "type"
        ? `${view.group.length} stations. Edits skip the ones that keep their own values.`
        : view.type?.label;

  return (
    <>
      <PanelHeader
        title={title}
        description={description}
        customized={customized}
        onBack={() => onSelect({ area: "overview" })}
        onReset={() =>
          view.kind === "all"
            ? editor.reset(["station.global"])
            : view.kind === "type"
              ? editor.reset(view.group.map((id) => `station.stations.${id}`))
              : editor.edit((config) => resetStation(config, editor.defaults, view.station))
        }
        resetLabel={`Reset ${title} to default`}
      />
      <div className={styles.body}>
        <StationPicker
          stations={editor.stations}
          types={types}
          value={pickerValue(view)}
          onSelect={onSelect}
        />
        {view.kind === "all" ? (
          <>
            <ConfigSections
              sections={sections}
              editor={editor}
              renderers={{
                weights: (context) => <SchedulerWeights context={context} editor={editor} />,
              }}
            />
            <StationTypeList editor={editor} types={types} onSelect={onSelect} />
          </>
        ) : (
          <>
            <StationTabs value={tab} onChange={setTab} panelId={panelId} />
            <div className={styles.stationSections} role="tabpanel" id={panelId}>
              {sections
                .filter((section) => tabOf(section) === tab)
                .map((section) => {
                  const render = sectionRenderers?.[section.id];
                  if (render) {
                    return (
                      <StationSection key={section.id} section={section} view={view}>
                        {render(section, view)}
                      </StationSection>
                    );
                  }
                  // Schedule and operations have no generic body; skip them until a renderer is given.
                  if (
                    section.fieldsFrom ||
                    section.fields.some((field) => field.type === "schedule")
                  ) {
                    return null;
                  }
                  return <StationSection key={section.id} section={section} view={view} />;
                })}
              {view.kind === "station" && tab === "setup" && info && (
                <StationDetails station={info} />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
