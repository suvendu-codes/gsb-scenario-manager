/** A mode a station can work in. A schedule may also have it off, which needs no permission. */
export type StationMode = "pick" | "put" | "audit";

/**
 * A station of a map, as the config page uses it. Read-only: it comes from the site registry
 * through the map's PPS lookup. A field is null when the registry data does not say.
 */
export type MapStation = {
  /** The registry's `pps_id` as a string. Used in config paths, so it never contains a dot. */
  id: string;
  /** A name for people, e.g. "PPS 4". */
  label: string;
  /** The registry's station type, as given (`manual`, `ppp_manual`, `tote_extraction`, ...). */
  registryType: string;
  /** The modes the station can run in, in the usual order (pick, put, audit). */
  allowedModes: StationMode[];
  status: "connected" | "disconnected" | "unknown";
  /** The systems the station serves (`rtp`, `ttp`, `relay`, ...). */
  systems: string[];
  location: string | null;
  pickDirection: number | null;
  /** How many points the station presents at (`pps_points` or `presentation_points`). */
  frontPositions: number | null;
  /** How long its queue is (`queue_barcodes`). */
  queueLength: number | null;
  /** How many roll cage docks it has (`docking_stations` of type `rollcage`). */
  rollcageDocks: number | null;
  registryUrl: string | null;
  /** The registry record's version, as given. */
  registryVersion: string | null;
};

/** A station the lookup returned that could not be used, and why. */
export type SkippedStation = { index: number; reason: string };

/** The stations of a map. */
export type MapStations = {
  mapId: string | null;
  /** The map version the stations belong to, if the server says. Opaque to the client. */
  mapVersion: string | null;
  stations: MapStation[];
  skipped: SkippedStation[];
};

type Json = Record<string, unknown>;

const MODES: readonly StationMode[] = ["pick", "put", "audit"];

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown): string | null =>
  typeof value === "string" && value !== ""
    ? value
    : typeof value === "number"
      ? String(value)
      : null;
const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const strings = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === "string" && item !== "",
  );

/** `[6, 7]` becomes `"6,7"`; a barcode or label stays as it is. */
function location(value: unknown): string | null {
  if (Array.isArray(value) && value.every((part) => typeof part === "number")) {
    return value.join(",");
  }
  return asString(value);
}

function status(value: unknown): MapStation["status"] {
  return value === "connected" || value === "disconnected" ? value : "unknown";
}

/** The first presentation point of a version 3 record, which carries its attributes. */
function firstPresentationPoint(record: Json): Json | null {
  const entities = isRecord(record.entities) ? record.entities : {};
  const [point] = asArray(entities.presentation_points);
  return isRecord(point) ? point : null;
}

/**
 * Reads one station record. It accepts the registry's version 2 records (flat: `pps_points`,
 * `queue_barcodes`, `docking_stations`), version 3 records (`system`, `entities`) and the
 * shape in the API design (`config.modes`). It looks for each field where any of them keeps it,
 * so a record mixing them still reads, and ignores fields it does not know.
 */
function readStation(record: Json): MapStation | string {
  const id = asString(record.pps_id);
  if (!id) return "no pps_id";
  if (id.includes(".")) return `pps_id "${id}" contains a dot`;

  const config = isRecord(record.config) ? record.config : {};
  const modes = new Set(strings(record.allowed_modes ?? config.modes));
  const point = firstPresentationPoint(record);
  const attributes = point && isRecord(point.attributes) ? point.attributes : {};
  const entities = isRecord(record.entities) ? record.entities : null;
  const docks = Array.isArray(record.docking_stations) ? record.docking_stations : null;

  return {
    id,
    label: /^\d+$/.test(id) ? `PPS ${id}` : id,
    registryType: asString(record.type) ?? "unknown",
    allowedModes: MODES.filter((mode) => modes.has(mode)),
    status: status(record.status),
    systems: strings(record.eligible_system ?? record.system),
    location: location(record.location ?? record.pick_position),
    pickDirection: asNumber(record.pick_direction) ?? asNumber(attributes.pick_direction),
    frontPositions: Array.isArray(record.pps_points)
      ? record.pps_points.length
      : entities && Array.isArray(entities.presentation_points)
        ? entities.presentation_points.length
        : null,
    queueLength: Array.isArray(record.queue_barcodes) ? record.queue_barcodes.length : null,
    rollcageDocks: docks
      ? docks.filter((dock) => isRecord(dock) && dock.dock_station_type === "rollcage").length
      : null,
    registryUrl: asString(record.pps_url),
    registryVersion: asString(record.version),
  };
}

/**
 * Reads the answer of the map's PPS lookup (`GET .../maps/{map}/pps`) into the stations the
 * config page uses. The upstream shape is still changing, so this is tolerant: the body may be
 * `{ map_id, map_version?, pps: [...] }` or the bare list, and each record may be in any of
 * the shapes `readStation` knows. Records without a usable id, and repeated ids, are skipped
 * and listed in `skipped` instead of failing the whole lookup.
 *
 * @param body - The parsed JSON of the response.
 * @returns The stations, or null when the body has no station list at all.
 */
export function fromUpstreamPps(body: unknown): MapStations | null {
  const list = Array.isArray(body) ? body : isRecord(body) ? body.pps : undefined;
  if (!Array.isArray(list)) return null;

  const stations: MapStation[] = [];
  const skipped: SkippedStation[] = [];
  const seen = new Set<string>();
  list.forEach((record, index) => {
    const station = isRecord(record) ? readStation(record) : "not an object";
    if (typeof station === "string") {
      skipped.push({ index, reason: station });
    } else if (seen.has(station.id)) {
      skipped.push({ index, reason: `pps_id "${station.id}" repeated` });
    } else {
      seen.add(station.id);
      stations.push(station);
    }
  });

  const head = isRecord(body) ? body : {};
  return {
    mapId: asString(head.map_id),
    mapVersion: asString(head.map_version),
    stations,
    skipped,
  };
}
