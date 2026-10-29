import { ScenarioConfigSchema } from '../../scenarios/presentation/dto/scenario-config.schema.js';
import type { ScenarioIssue } from './errors.js';

export const DATA_SLOTS = ['inbound', 'outbound', 'masterdata', 'mockput'] as const;
export type DataSlot = (typeof DATA_SLOTS)[number];
/** mockput is optional (LLD §5 issue codes). */
export const REQUIRED_DATA_SLOTS: readonly DataSlot[] = ['inbound', 'outbound', 'masterdata'];

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Defaults with overrides laid on top: objects merge field by field, arrays and scalars replace. */
export function mergeOverrides(defaults: unknown, overrides: unknown): unknown {
  if (overrides === undefined) return structuredClone(defaults);
  if (!isPlain(defaults) || !isPlain(overrides)) return structuredClone(overrides);
  const out: Plain = structuredClone(defaults);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    out[key] = mergeOverrides(defaults[key], value);
  }
  return out;
}

/**
 * The effective config the engine receives: every module resolved to its values. Station-level
 * overrides are keyed by station id, so each overridden station gets its own merged block next
 * to the shared defaults that apply to every other station.
 */
export function effectiveConfig(config: Plain): Plain {
  const parsed = ScenarioConfigSchema.parse(config);
  const levels = parsed.station.station_level;
  const overrides = (levels.overrides ?? {}) as Record<string, unknown>;
  return {
    wms_order: mergeOverrides(parsed.wms_order.defaults, parsed.wms_order.overrides),
    agent: mergeOverrides(parsed.agent.defaults, parsed.agent.overrides),
    station: {
      shared: mergeOverrides(parsed.station.shared.defaults, parsed.station.shared.overrides),
      station_level: {
        default: structuredClone(levels.defaults),
        stations: Object.fromEntries(
          Object.entries(overrides).map(([stationId, o]) => [stationId, mergeOverrides(levels.defaults, o)]),
        ),
      },
    },
  };
}

export interface ScenarioInputs {
  /** The stored config (inline body or blob contents); null when the scenario has none. */
  config: Plain | null;
  dataUris: Record<DataSlot, string | null>;
}

/** Local checks (no upstream calls). Collects every problem instead of stopping at the first. */
export function checkScenarioInputs({ config, dataUris }: ScenarioInputs): ScenarioIssue[] {
  const issues: ScenarioIssue[] = [];

  if (!config || Object.keys(config).length === 0) {
    issues.push({ code: 'config_incomplete', message: 'The scenario has no config.' });
  } else {
    const result = ScenarioConfigSchema.safeParse(config);
    if (!result.success) {
      for (const issue of result.error.issues.slice(0, 50)) {
        const path = ['config', ...issue.path.map(String)].join('.');
        const missing = issue.code === 'invalid_type' && /received undefined/.test(issue.message);
        issues.push({
          code: missing ? 'config_incomplete' : 'config_invalid',
          path,
          message: missing ? `${path} is missing.` : `${path}: ${issue.message}`,
        });
      }
    }
  }

  for (const slot of REQUIRED_DATA_SLOTS) {
    if (!dataUris[slot]) {
      issues.push({ code: 'data_file_missing', file_type: slot, message: `The ${slot} file has not been uploaded.` });
    }
  }
  return issues;
}
