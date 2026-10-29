import type { ConfigValues, Overrides } from "./types";

/** Segments that must never be followed, so a path can't reach into an object's prototype. */
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

/** True for a plain `{}` object (not an array, not null). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Splits a dot-notation path into its segments.
 *
 * @param path - A path such as `"wms.release.waves"`.
 * @returns The segments, or null if the path is empty or has an empty or unsafe segment.
 */
export function splitPath(path: string): string[] | null {
  const segments = path.split(".");
  if (segments.some((segment) => segment === "" || FORBIDDEN_SEGMENTS.has(segment))) return null;
  return segments;
}

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * Reads the value at a path.
 *
 * @param root - The object to read from.
 * @param path - A dot-notation path.
 * @returns The value, or `undefined` if the path does not exist.
 */
export function getAtPath(root: unknown, path: string): unknown {
  const segments = splitPath(path);
  if (!segments) return undefined;
  let current: unknown = root;
  for (const segment of segments) {
    if (!isPlainObject(current) || !hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

/** True when the path exists in `root` (a `null` value counts as existing). */
export function hasPath(root: unknown, path: string): boolean {
  const segments = splitPath(path);
  if (!segments) return false;
  let current: unknown = root;
  for (const segment of segments) {
    if (!isPlainObject(current) || !hasOwn(current, segment)) return false;
    current = current[segment];
  }
  return true;
}

/**
 * True when the path exists in `root` and holds a single value (a string, number, boolean, null
 * or an array) rather than a group of values. Only such paths can be set.
 */
export function isLeafPath(root: unknown, path: string): boolean {
  return hasPath(root, path) && !isPlainObject(getAtPath(root, path));
}

/** Writes a value at a path of `target`, in place. The path must already exist. */
function assignAtPath(target: Record<string, unknown>, segments: string[], value: unknown): void {
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}

/** Compares two JSON values deeply (objects by key, arrays in order). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

/**
 * The effective config: the defaults with the overrides applied on top. Overrides for paths
 * that don't exist in the defaults, or that point at a group of values, are ignored. Neither
 * input is changed.
 *
 * Ignoring an orphaned override is silent. That cannot happen yet: the mock's defaults never
 * change and writes reject unknown paths. It becomes possible once defaults depend on the map,
 * and the server should then report the orphaned paths (review S1, deferred with M1).
 *
 * @param defaults - The scenario's default config.
 * @param overrides - Changes by dot-notation path.
 */
export function resolveConfig(defaults: ConfigValues, overrides: Overrides): ConfigValues {
  const resolved = structuredClone(defaults) as unknown as Record<string, unknown>;
  for (const [path, value] of Object.entries(overrides)) {
    const segments = splitPath(path);
    if (!segments || !isLeafPath(defaults, path)) continue;
    assignAtPath(resolved, segments, structuredClone(value));
  }
  return resolved as unknown as ConfigValues;
}
