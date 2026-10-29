"use client";

import { ChevronDown, ChevronUp, Pencil, Search } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Stepper } from "@/features/scenario-config/components/fields/Stepper";
import { cn } from "@/lib/utils";

import type { BotsLive, StationLive, StationState } from "../live/types";
import { livePanelStyles as styles } from "./LivePanel.styles";
import { STATE_LABELS, StationStatePill } from "./StationStatePill";

type LivePanelProps = {
  bots: BotsLive;
  stations: StationLive[];
  /** False once the run has ended: nothing can be changed then. */
  live: boolean;
  warmingUp: boolean;
  expanded: string | null;
  onExpand: (id: string | null) => void;
  onToggleStation: (id: string, on: boolean) => void;
  onSetBots: (bots: number) => void;
};

const WORKING: StationState[] = ["working", "queue-full"];

/**
 * The live status panel: the bots (with their count, which can be changed mid-run) and the
 * stations (search, filter by state, and open one to see its queue and turn it off or on).
 * Every change is logged as a live change.
 */
export function LivePanel({
  bots,
  stations,
  live,
  warmingUp,
  expanded,
  onExpand,
  onToggleStation,
  onSetBots,
}: LivePanelProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StationState | "all">("all");
  const [editing, setEditing] = useState(false);
  const [count, setCount] = useState(bots.total);

  const shown = stations.filter(
    (s) =>
      (filter === "all" || s.state === filter) &&
      s.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const working = stations.filter((s) => WORKING.includes(s.state)).length;

  return (
    <aside className={styles.root} aria-label="Live status">
      <section className={styles.bots} aria-label="Bots">
        <div className={styles.botsHead}>
          <div>
            <h2 className={styles.title}>Bots</h2>
            <p className={styles.subtitle}>
              {warmingUp
                ? "Coming online"
                : `${bots.working} working · ${bots.ready} ready · ${bots.error} in error`}
            </p>
          </div>
          <span className={styles.count}>{bots.total}</span>
          {live && (
            <button
              type="button"
              className={styles.icon}
              aria-label="Change the number of bots"
              onClick={() => {
                setCount(bots.total);
                setEditing(true);
              }}
            >
              <Pencil className={styles.iconSvg} />
            </button>
          )}
        </div>
        {editing && (
          <div className={styles.editor}>
            <div className={styles.editorRow}>
              <span className={styles.editorLabel}>Bots working</span>
              <Stepper label="Bots working" value={count} min={0} max={200} onChange={setCount} />
            </div>
            <p className={styles.note}>Takes effect now and is logged as a live change.</p>
            <div className={styles.editorActions}>
              <button type="button" className={styles.secondary} onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={count === bots.total}
                onClick={() => {
                  onSetBots(count);
                  setEditing(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={styles.stations} aria-label="Stations">
        <div className={styles.stationsHead}>
          <h2 className={styles.title}>Stations</h2>
          <span className={styles.subtitle}>
            {working} of {stations.length} working
          </span>
        </div>
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search stations"
              placeholder="Search"
              className={styles.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select
            aria-label="Filter stations by state"
            className={styles.filter}
            value={filter}
            onChange={(event) => setFilter(event.target.value as StationState | "all")}
          >
            <option value="all">All</option>
            {Object.entries(STATE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <ul className={styles.list}>
          {shown.map((station) => {
            const open = expanded === station.id;
            return (
              <li key={station.id} className={cn(styles.item, open && styles.itemOpen)}>
                <button
                  type="button"
                  className={styles.itemHead}
                  aria-expanded={open}
                  onClick={() => onExpand(open ? null : station.id)}
                >
                  <span className={styles.itemName}>{station.label}</span>
                  <StationStatePill station={station} />
                  {open ? (
                    <ChevronUp className={styles.chevron} />
                  ) : (
                    <ChevronDown className={styles.chevron} />
                  )}
                </button>
                {open && (
                  <div className={styles.details}>
                    <dl className={styles.facts}>
                      <div>
                        <dt>Queue</dt>
                        <dd>
                          {station.queue === null
                            ? "—"
                            : `${station.queue} of ${station.queueLimit}`}
                        </dd>
                      </div>
                      <div>
                        <dt>Tasks</dt>
                        <dd>
                          {station.tasks === null
                            ? "—"
                            : `${station.tasks} of ${station.tasksNeeded} needed`}
                        </dd>
                      </div>
                      <div>
                        <dt>Picks · last 30m</dt>
                        <dd>
                          {station.picksWindow === null
                            ? "—"
                            : `${station.picksWindow} vs avg ${station.picksAverage}`}
                        </dd>
                      </div>
                      <div>
                        <dt>Next</dt>
                        <dd>{station.next ?? "—"}</dd>
                      </div>
                    </dl>
                    <label className={styles.toggleRow}>
                      <span>
                        <span className={styles.toggleTitle}>Station on</span>
                        <span className={styles.note}>
                          Turning it off stops new tasks here. Logged as a live change.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        role="switch"
                        className={styles.switch}
                        checked={!station.turnedOff}
                        disabled={!live}
                        onChange={(event) => onToggleStation(station.id, event.target.checked)}
                      />
                    </label>
                  </div>
                )}
              </li>
            );
          })}
          {shown.length === 0 && <li className={styles.empty}>No station matches.</li>}
        </ul>
      </section>
    </aside>
  );
}
