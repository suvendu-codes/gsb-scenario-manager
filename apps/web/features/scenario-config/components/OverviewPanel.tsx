"use client";

import { AlertTriangle, Check, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DATASET_SLOTS } from "@/features/scenario-setup/constants";
import { useScenarioDetail } from "@/features/scenario-setup/hooks";

import { datasetSummary } from "../dataset-summary";
import { ALL_STATIONS, type PanelSelection, type ReadyConfigEditor } from "../panel";
import { searchSettings } from "../search";
import { isCustomized } from "../state/customized";
import type { ModuleId } from "../types";
import { overviewPanelStyles as styles } from "./OverviewPanel.styles";

/** What to show when a module is chosen: the station module opens on "All stations". */
function selectionFor(module: ModuleId): PanelSelection {
  return module === "station" ? { area: "station", station: ALL_STATIONS } : { area: module };
}

/** The names of the scenario's project and map. */
export type ScenarioSetupNames = { projectName: string; mapName: string };

type OverviewPanelProps = {
  scenarioId: string;
  setup: ScenarioSetupNames;
  editor: ReadyConfigEditor;
  onSelect: (selection: PanelSelection) => void;
};

/**
 * The summary, shown when nothing is selected: a search box for settings, the problems that
 * would stop the run, the scenario's setup (project, map, datasets, run length) with a link
 * back to it, and a row per module to configure. Typing in the search box replaces the rest
 * with the matching settings.
 *
 * @param scenarioId - The scenario being configured.
 * @param setup - The scenario's project and map names.
 * @param editor - The loaded config editor.
 * @param onSelect - Called with the module the user opens.
 */
export function OverviewPanel({
  scenarioId,
  setup,
  editor,
  onSelect,
}: OverviewPanelProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const detail = useScenarioDetail(scenarioId);
  const hits = useMemo(() => searchSettings(editor.catalog, query), [editor.catalog, query]);
  const searching = query.trim() !== "";

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Summary</h2>
          <p className={styles.subtitle}>Configure any timeline from here.</p>
        </div>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <Input
            type="search"
            className={styles.search}
            placeholder="Search any setting…"
            aria-label="Search settings"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {searching ? (
        hits.length > 0 ? (
          <ul className={styles.results} aria-label="Matching settings">
            {hits.map((hit) => (
              <li key={`${hit.module}-${hit.label}`}>
                <button
                  type="button"
                  className={styles.result}
                  onClick={() => {
                    setQuery("");
                    onSelect(selectionFor(hit.module));
                  }}
                >
                  <span className={styles.resultLabel}>{hit.label}</span>
                  <span className={styles.resultPath}>
                    {hit.moduleLabel} › {hit.section}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No setting matches “{query.trim()}”.</p>
        )
      ) : (
        <>
          {editor.issues.length > 0 && (
            <section className={styles.section} aria-label="Needs attention">
              <div className={styles.issues}>
                <h3 className={styles.issuesTitle}>Needs attention</h3>
                <ul>
                  {editor.issues.map((issue) => (
                    <li key={`${issue.module}-${issue.message}`} className={styles.issue}>
                      <AlertTriangle className={styles.issueIcon} aria-hidden="true" />
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className={styles.section} aria-label="Scenario setup">
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Scenario setup</h3>
              <Link
                href={`/scenarios/${encodeURIComponent(scenarioId)}/setup`}
                className={styles.link}
              >
                Edit ›
              </Link>
            </div>
            <dl className={styles.rows}>
              <div className={styles.row}>
                <dt className={styles.rowLabel}>Project</dt>
                <dd className={styles.rowValue}>{setup.projectName}</dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.rowLabel}>Map</dt>
                <dd className={styles.rowValue}>{setup.mapName}</dd>
              </div>
              {DATASET_SLOTS.map((slot) => {
                const record = detail.data?.datasets[slot.key] ?? null;
                return (
                  <div key={slot.key} className={styles.row}>
                    <dt className={styles.rowLabel}>{slot.label}</dt>
                    <dd className={styles.rowValue}>
                      {record ? (
                        <span className={styles.dataset} title={datasetSummary(record)}>
                          <Check
                            className={cn(
                              styles.datasetIcon,
                              record.valid ? styles.datasetOk : styles.datasetBad,
                            )}
                            aria-label={record.valid ? "Valid" : "Has problems"}
                          />
                          <span className={styles.datasetName}>{record.fileName}</span>
                        </span>
                      ) : (
                        <span className={styles.datasetMissing}>
                          {detail.isPending
                            ? "Loading…"
                            : slot.required
                              ? "Not added"
                              : "Not added (optional)"}
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
              <div className={styles.row}>
                <dt className={styles.rowLabel}>Run duration</dt>
                <dd className={styles.rowValue}>{editor.runDurationHours}h</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section} aria-label="Configure">
            <h3 className={styles.sectionTitle}>Configure</h3>
            <ul className={styles.modules}>
              {editor.catalog.modules.map((module) => (
                <li key={module.id} className={styles.module}>
                  <span className={styles.moduleLabel}>{module.label}</span>
                  {isCustomized(editor.overrides, module.id) && (
                    <span className={styles.customDot} role="img" aria-label="Customized" />
                  )}
                  <button
                    type="button"
                    className={styles.configure}
                    aria-label={`Configure ${module.label}`}
                    onClick={() => onSelect(selectionFor(module.id))}
                  >
                    Configure
                    <ChevronRight className={styles.configureIcon} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
