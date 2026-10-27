/** A bot type of a map, with the count the sizer gives for it. */
export type MapBotType = {
  /** The sizer's type, as given (`quicktron_htm`). */
  type: string;
  /**
   * The key of this bot type in the agent config's fleet (`agent.fleet.<key>`): `htm` or `vtm`
   * for a type ending in `_htm` or `_vtm`, otherwise the type itself.
   */
  fleetKey: string;
  label: string;
  imageUrl: string | null;
  /** How many bots the sizer gives for this map: the fleet's starting count. */
  count: number;
};

/** The sizer's answer for a map. */
export type MapFleet = {
  mapId: string | null;
  /** The map version the answer belongs to, if the server says. Opaque to the client. */
  mapVersion: string | null;
  botTypes: MapBotType[];
  /** Entries that could not be used, and why. */
  skipped: Array<{ index: number; reason: string }>;
};

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asString = (value: unknown): string | null =>
  typeof value === "string" && value !== ""
    ? value
    : typeof value === "number"
      ? String(value)
      : null;

function fleetKey(type: string): string {
  const match = /_(htm|vtm)$/i.exec(type);
  return match ? match[1].toLowerCase() : type;
}

/**
 * Reads the answer of the map's sizer lookup (`GET .../maps/{map}/sizer`):
 * `{ map_id, map_version?, bot_types: [{ type, name, image_url, count }] }`, or the bare list.
 * Fields it does not know are ignored; an entry without a type or with a count that is not a
 * whole number of 0 or more is skipped and listed in `skipped`.
 *
 * @param body - The parsed JSON of the response.
 * @returns The bot types, or null when the body has no bot type list at all.
 */
export function fromSizer(body: unknown): MapFleet | null {
  const list = Array.isArray(body) ? body : isRecord(body) ? body.bot_types : undefined;
  if (!Array.isArray(list)) return null;

  const botTypes: MapBotType[] = [];
  const skipped: MapFleet["skipped"] = [];
  list.forEach((entry, index) => {
    const type = isRecord(entry) ? asString(entry.type) : null;
    if (!isRecord(entry) || !type) return skipped.push({ index, reason: "no type" });
    const count = entry.count;
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
      return skipped.push({
        index,
        reason: `count of "${type}" is not a whole number of 0 or more`,
      });
    }
    if (botTypes.some((bot) => bot.type === type)) {
      return skipped.push({ index, reason: `type "${type}" repeated` });
    }
    botTypes.push({
      type,
      fleetKey: fleetKey(type),
      label: asString(entry.name) ?? type,
      imageUrl: asString(entry.image_url),
      count,
    });
  });

  const head = isRecord(body) ? body : {};
  return {
    mapId: asString(head.map_id),
    mapVersion: asString(head.map_version),
    botTypes,
    skipped,
  };
}
