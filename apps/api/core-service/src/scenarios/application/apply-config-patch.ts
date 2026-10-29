import { flattenObj } from '../presentation/dto/flatten-overrides.js';

type Plain = Record<string, unknown>;

export interface ConfigChange {
  /** Dot path without the `overrides` segment, e.g. `config.agent.outage_pct`. */
  path: string;
  to: 'custom' | 'default';
  /** The new override for `custom`; the default that applies again for `default`. */
  value: unknown;
}

const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);

const getAt = (root: unknown, path: string[]): unknown =>
  path.reduce<unknown>((node, key) => (isPlain(node) ? node[key] : undefined), root);

/**
 * Applies an overrides patch to a stored config: a value sets that override, `null` removes it so the
 * default applies again. Arrays are replaced wholesale. Returns the new config and one change per leaf.
 */
export function applyConfigPatch(config: Plain, patch: Plain) {
  const next = structuredClone(config);
  const changes: ConfigChange[] = [];

  for (const [flatPath, value] of Object.entries(flattenObj(patch))) {
    const path = flatPath.split('.');
    const overrides = path.indexOf('overrides');
    const defaultsPath = [...path.slice(0, overrides), 'defaults', ...path.slice(overrides + 1)];
    // station_level overrides are keyed by station id, which defaults are not.
    if (path[0] === 'station' && path[1] === 'station_level') defaultsPath.splice(overrides + 1, 1);

    let parent = next;
    for (const key of path.slice(0, -1)) {
      if (!isPlain(parent[key])) parent[key] = {};
      parent = parent[key] as Plain;
    }
    const leaf = path[path.length - 1];
    if (value === null) delete parent[leaf];
    else parent[leaf] = value;

    changes.push({
      path: ['config', ...path.filter((_, i) => i !== overrides)].join('.'),
      to: value === null ? 'default' : 'custom',
      value: value === null ? (getAt(next, defaultsPath) ?? null) : value,
    });
  }

  return { config: next, changes, modules: [...new Set(changes.map((c) => c.path.split('.')[1]))] };
}
