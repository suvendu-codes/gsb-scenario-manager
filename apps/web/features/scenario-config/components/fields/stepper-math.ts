/** The allowed values of a stepper: from `min` to `max` in steps of `step` (default 1). */
export type StepperRange = { min: number; max: number; step?: number };

/** How many decimals a step has (0.25 has 2), so results don't pick up float noise. */
function decimalsOf(step: number): number {
  const text = String(step);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

/**
 * Pulls a value into the range and onto the nearest step, counted from `min`.
 *
 * @param value - Any number.
 * @param range - The allowed range and step.
 */
export function snapToStep(value: number, { min, max, step = 1 }: StepperRange): number {
  const clamped = Math.min(Math.max(value, min), max);
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.min(snapped, max).toFixed(decimalsOf(step)));
}

/**
 * The value one step up or down, kept inside the range.
 *
 * @param value - The current value.
 * @param direction - `1` for up, `-1` for down.
 * @param range - The allowed range and step.
 */
export function stepBy(value: number, direction: 1 | -1, range: StepperRange): number {
  return snapToStep(value + direction * (range.step ?? 1), range);
}

/**
 * Reads a number typed into a stepper. Spaces and a trailing unit (`"2.25x"`, `"5 %"`) are
 * ignored; the result is snapped into the range.
 *
 * @param text - What the user typed.
 * @param range - The allowed range and step.
 * @returns The value, or null if the text is not a number.
 */
export function parseStepperInput(text: string, range: StepperRange): number | null {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*[^\d\s.-]*\s*$/.exec(text.replace(",", "."));
  return match ? snapToStep(Number(match[1]), range) : null;
}

/** The value as text, with as many decimals as the step needs (`2.25`, `4`). */
export function formatStepperValue(value: number, step = 1): string {
  return value.toFixed(decimalsOf(step));
}
