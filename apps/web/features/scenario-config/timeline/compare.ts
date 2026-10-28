import { deepEqual } from "../paths";
import type { ConfigCatalog, ConfigValues, StationMode } from "../types";
import type { MapStation } from "../upstream/stations";
import { breakMarks } from "./station-lane";

/** What a compare column reads from. */
export type CompareContext = {
  config: ConfigValues;
  defaults: ConfigValues;
  catalog: ConfigCatalog;
  stations: readonly MapStation[];
  runHours: number;
};

/** One column of the compare table, as the design's compare view has them. */
export type CompareColumn = {
  id: string;
  label: string;
  /** The column only applies to stations that can work in this mode; others show "—". */
  mode?: StationMode;
  /** The value shown for one station. */
  value: (context: CompareContext, id: string) => string;
  /** Whether the station's value differs from its default. */
  customized: (context: CompareContext, id: string) => boolean;
};

/** One cell: its text (null for "does not apply") and whether it is customized. */
export type CompareCell = { value: string | null; customized: boolean };

const station = (c: CompareContext, id: string) => c.config.station.stations[id];
const fallback = (c: CompareContext, id: string) => c.defaults.station.stations[id];
const differs =
  (read: (s: ConfigValues["station"]["stations"][string]) => unknown) =>
  (c: CompareContext, id: string) =>
    !deepEqual(read(station(c, id)), read(fallback(c, id)));

const optionLabel = (options: Array<{ value: string; label: string }>, value: unknown) =>
  options.find((option) => option.value === value)?.label ?? String(value);

const variance = (mode: StationMode, label: string): CompareColumn => ({
  id: `variance-${mode}`,
  label,
  value: (c, id) => `${station(c, id).setup.variance[mode]} s`,
  customized: differs((s) => s.setup.variance[mode]),
});

/** The compare table's columns, in the design's order. */
export const COMPARE_COLUMNS: CompareColumn[] = [
  {
    id: "modes",
    label: "Modes",
    value: (c, id) =>
      station(c, id)
        .schedule.map((block) => block.mode)
        .join(","),
    customized: () => false,
  },
  variance("pick", "Pick variance"),
  variance("put", "Put variance"),
  variance("audit", "Audit variance"),
  {
    id: "breaks",
    label: "Total breaks",
    value: (c, id) => {
      const ids = Object.keys(c.config.station.stations);
      const place = { id, index: ids.indexOf(id), count: ids.length };
      return String(breakMarks(station(c, id).schedule, c.runHours, place).length);
    },
    customized: differs((s) => s.schedule.map((block) => block.breaks)),
  },
  {
    id: "queue",
    label: "Queue limit",
    value: (c, id) => String(station(c, id).setup.queueLimit),
    customized: differs((s) => s.setup.queueLimit),
  },
  {
    id: "rebalancing",
    label: "Rebalancing",
    value: (c, id) => (station(c, id).setup.rebalancing ? "On" : "Off"),
    customized: differs((s) => s.setup.rebalancing),
  },
  {
    id: "pickStrategy",
    label: "Scheduling strategy",
    mode: "pick",
    value: (c, id) => {
      const field = c.catalog.operations.pick.groups
        .flatMap((group) => group.fields)
        .find((candidate) => candidate.key === "pickStrategy");
      const value = station(c, id).operations.pick.pickStrategy;
      return field && "options" in field ? optionLabel(field.options, value) : String(value);
    },
    customized: differs((s) => s.operations.pick.pickStrategy),
  },
  {
    id: "putCategory",
    label: "Put category",
    mode: "put",
    value: (c, id) =>
      optionLabel(c.catalog.operations.put.categories, station(c, id).operations.put.category),
    customized: differs((s) => s.operations.put.category),
  },
  {
    id: "auditZeroConf",
    label: "Confirm zero counts",
    mode: "audit",
    value: (c, id) => (station(c, id).operations.audit.auditZeroConf ? "On" : "Off"),
    customized: differs((s) => s.operations.audit.auditZeroConf),
  },
];

/** Whether a station can work in a mode, as the site registry says (unknown stations can). */
function canWork(c: CompareContext, id: string, mode: StationMode): boolean {
  const info = c.stations.find((candidate) => candidate.id === id);
  return !info || info.registryType === "unknown" || info.allowedModes.includes(mode);
}

/** One station's cells. A column for a mode the station can't work in shows "—". */
export function compareStationRow(
  context: CompareContext,
  id: string,
  columns: readonly CompareColumn[] = COMPARE_COLUMNS,
): CompareCell[] {
  return columns.map((column) =>
    column.mode && !canWork(context, id, column.mode)
      ? { value: null, customized: false }
      : { value: column.value(context, id), customized: column.customized(context, id) },
  );
}

/**
 * A type's cells: the value its stations share, or "Mixed" when they differ ("—" when the
 * column applies to none of them). A cell is customized when any station's is.
 */
export function compareTypeRow(
  context: CompareContext,
  ids: readonly string[],
  columns: readonly CompareColumn[] = COMPARE_COLUMNS,
): CompareCell[] {
  const rows = ids.map((id) => compareStationRow(context, id, columns));
  return columns.map((_, i) => {
    const cells = rows.map((row) => row[i]);
    const values = cells
      .map((cell) => cell.value)
      .filter((value): value is string => value !== null);
    return {
      value:
        values.length === 0 ? null : values.every((v) => v === values[0]) ? values[0] : "Mixed",
      customized: cells.some((cell) => cell.customized),
    };
  });
}
