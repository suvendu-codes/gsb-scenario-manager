import { describe, expect, it } from "vitest";

import { formatStepperValue, parseStepperInput, snapToStep, stepBy } from "./stepper-math";

const volume = { min: 0.25, max: 5, step: 0.25 };

describe("snapToStep", () => {
  it("clamps into the range", () => {
    expect(snapToStep(0, volume)).toBe(0.25);
    expect(snapToStep(9, volume)).toBe(5);
  });

  it("snaps to the nearest step counted from min", () => {
    expect(snapToStep(2.3, volume)).toBe(2.25);
    expect(snapToStep(2.4, volume)).toBe(2.5);
    expect(snapToStep(13, { min: 1, max: 50 })).toBe(13);
    expect(snapToStep(12.6, { min: 1, max: 50 })).toBe(13);
  });

  it("counts steps from min, not from zero", () => {
    expect(snapToStep(7, { min: 4, max: 30, step: 5 })).toBe(9);
  });

  it("stays at or below max when max is not on a step", () => {
    expect(snapToStep(30, { min: 0, max: 22, step: 5 })).toBe(20);
  });

  it("does not leave float noise", () => {
    expect(snapToStep(0.1 + 0.2, { min: 0, max: 1, step: 0.1 })).toBe(0.3);
  });
});

describe("stepBy", () => {
  it("moves one step and stops at the ends", () => {
    expect(stepBy(2, 1, volume)).toBe(2.25);
    expect(stepBy(2, -1, volume)).toBe(1.75);
    expect(stepBy(5, 1, volume)).toBe(5);
    expect(stepBy(0.25, -1, volume)).toBe(0.25);
  });

  it("steps by one by default", () => {
    expect(stepBy(10, 1, { min: 1, max: 50 })).toBe(11);
  });
});

describe("parseStepperInput", () => {
  it("reads plain numbers and snaps them", () => {
    expect(parseStepperInput("2.3", volume)).toBe(2.25);
    expect(parseStepperInput(" 7 ", { min: 1, max: 24 })).toBe(7);
    expect(parseStepperInput("2,5", volume)).toBe(2.5);
  });

  it("ignores a trailing unit", () => {
    expect(parseStepperInput("2.25x", volume)).toBe(2.25);
    expect(parseStepperInput("5 %", { min: 0, max: 50 })).toBe(5);
    expect(parseStepperInput("12 m/min", { min: 4, max: 30 })).toBe(12);
  });

  it("clamps out-of-range numbers", () => {
    expect(parseStepperInput("99", { min: 0, max: 50 })).toBe(50);
    expect(parseStepperInput("-4", { min: 0, max: 50 })).toBe(0);
  });

  it("returns null for text that is not a number", () => {
    expect(parseStepperInput("", volume)).toBeNull();
    expect(parseStepperInput("abc", volume)).toBeNull();
    expect(parseStepperInput("1.2.3", volume)).toBeNull();
  });
});

describe("formatStepperValue", () => {
  it("shows as many decimals as the step has", () => {
    expect(formatStepperValue(2.25, 0.25)).toBe("2.25");
    expect(formatStepperValue(2, 0.25)).toBe("2.00");
    expect(formatStepperValue(0.5, 0.5)).toBe("0.5");
    expect(formatStepperValue(4)).toBe("4");
  });
});
