"use client";

import { useId } from "react";

import { STATION_TABS, type StationTabId } from "./station-tabs";
import { stationTabsStyles as styles } from "./StationTabs.styles";

/**
 * The tab list of a type's or a station's panel. Arrow keys move between tabs.
 *
 * @param value - The open tab.
 * @param onChange - Called with the tab to open.
 * @param panelId - Id of the element the tabs control.
 */
export function StationTabs({
  value,
  onChange,
  panelId,
}: {
  value: StationTabId;
  onChange: (tab: StationTabId) => void;
  panelId: string;
}): React.JSX.Element {
  const id = useId();

  function move(from: number, step: number): void {
    const next = STATION_TABS[(from + step + STATION_TABS.length) % STATION_TABS.length].id;
    onChange(next);
    document.getElementById(`${id}-${next}`)?.focus();
  }

  return (
    <div className={styles.root} role="tablist" aria-label="Station settings">
      {STATION_TABS.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`${id}-${tab.id}`}
          aria-selected={value === tab.id}
          aria-controls={panelId}
          tabIndex={value === tab.id ? 0 : -1}
          className={styles.tab}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") move(index, 1);
            else if (event.key === "ArrowLeft") move(index, -1);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
