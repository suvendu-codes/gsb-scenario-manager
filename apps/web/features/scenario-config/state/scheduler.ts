import { deepEqual } from "../paths";
import { SCHEDULER_WEIGHTS } from "../schema";
import type { ConfigValues, SchedulerPreset } from "../types";

type Weights = ConfigValues["station"]["global"]["pickScheduler"]["weights"];

/**
 * The preset whose weights match exactly. The preset is not stored; the panel shows it by name
 * while the weights match, and "Custom" otherwise.
 *
 * @param weights - The current scheduler weights.
 * @param presets - The catalog's presets.
 * @returns The matching preset, or null for custom weights.
 */
export function presetFor(weights: Weights, presets: SchedulerPreset[]): SchedulerPreset | null {
  return presets.find((preset) => deepEqual(preset.weights, weights)) ?? null;
}

/**
 * Each weight as a whole-number percent of all weights ("% of cycle"). All zero gives all 0.
 *
 * @param weights - The scheduler weights.
 */
export function weightShares(weights: Weights): Record<(typeof SCHEDULER_WEIGHTS)[number], number> {
  const total = SCHEDULER_WEIGHTS.reduce((sum, key) => sum + weights[key], 0);
  return Object.fromEntries(
    SCHEDULER_WEIGHTS.map((key) => [key, total > 0 ? Math.round((weights[key] / total) * 100) : 0]),
  ) as Record<(typeof SCHEDULER_WEIGHTS)[number], number>;
}
