import type { CatalogSection } from "../../types";

/** The tabs of a type's or a station's panel, as the design names them. */
export const STATION_TABS = [
  { id: "modes", label: "Modes and Schedule" },
  { id: "setup", label: "Station Setup" },
  { id: "ops", label: "Operations" },
] as const;

export type StationTabId = (typeof STATION_TABS)[number]["id"];

/** The tab a section is shown in: the schedule, the operations, or the station's setup. */
export function tabOf(section: CatalogSection): StationTabId {
  if (section.overrideSection === "schedule") return "modes";
  if (section.fieldsFrom === "operations") return "ops";
  return "setup";
}
