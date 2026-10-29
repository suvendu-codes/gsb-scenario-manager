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

type OverviewPanelProps = {
  scenarioId: string;
  editor: ReadyConfigEditor;
  onSelect: (selection: PanelSelection) => void;
};

/**
 * The panel shown when nothing is selected: a search box for settings, the problems that would
 * stop the run, the scenario's datasets with a link back to setup, the run length, and the
 * modules to open. Typing in the search box replaces the rest with the matching settings.
 *
 * @param scenarioId - The scenario being configured.
 * @param editor - The loaded config editor.
 * @param onSelect - Called with the module the user opens.
 */
export function OverviewPanel({
  scenarioId,
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
        <h2 className={styles.title}>Overview</h2>
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
          <p className={cn(styles.section, styles.intro)}>
            Defaults are pre-loaded and runnable. Choose a module to review or change its settings,
            or search for a setting by name.
          </p>

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

          <section className={styles.section} aria-label="Datasets and setup">
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Datasets and setup</h3>
              <Link
                href={`/scenarios/${encodeURIComponent(scenarioId)}/setup`}
                className={styles.link}
              >
                Edit setup
              </Link>
            </div>
            <ul className={styles.datasets}>
              {DATASET_SLOTS.map((slot) => {
                const record = detail.data?.datasets[slot.key] ?? null;
                return (
                  <li key={slot.key} className={styles.dataset}>
                    {record ? (
                      <Check
                        className={cn(
                          styles.datasetIcon,
                          record.valid ? styles.datasetOk : styles.datasetBad,
                        )}
                        aria-label={record.valid ? "Valid" : "Has problems"}
                      />
                    ) : (
                      <span
                        className={cn(styles.datasetIcon, styles.datasetNone)}
                        aria-hidden="true"
                      >
                        –
                      </span>
                    )}
                    <span className={styles.datasetText}>
                      {record ? (
                        <>
                          <span className={styles.datasetName}>{record.fileName}</span>
                          <span className={styles.datasetDetail}>{datasetSummary(record)}</span>
                        </>
                      ) : (
                        <span className={styles.datasetMissing}>
                          {slot.label} ·{" "}
                          {detail.isPending
                            ? "Loading…"
                            : slot.required
                              ? "Not added"
                              : "Not added (optional)"}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Run duration</span>
              <span className={styles.rowValue}>{editor.runDurationHours}h</span>
            </div>
          </section>

          <section className={styles.section} aria-label="Settings">
            <h3 className={styles.sectionTitle}>Settings</h3>
            <ul className={styles.modules}>
              {editor.catalog.modules.map((module) => (
                <li key={module.id}>
                  <button
                    type="button"
                    className={styles.module}
                    onClick={() => onSelect(selectionFor(module.id))}
                  >
                    <span className={styles.moduleText}>
                      <span className={styles.moduleLabel}>{module.label}</span>
                      <span className={styles.moduleDescription}>{module.description}</span>
                    </span>
                    {isCustomized(editor.overrides, module.id) && (
                      <span className={styles.moduleTag}>Customized</span>
                    )}
                    <ChevronRight className={styles.moduleChevron} aria-hidden="true" />
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
