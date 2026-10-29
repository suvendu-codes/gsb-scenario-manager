import { describe, expect, it } from "vitest";

import { configCatalog } from "../catalog";
import { buildDefaults } from "../defaults";
import { presetFor, weightShares } from "./scheduler";

const defaultWeights = buildDefaults().station.global.pickScheduler.weights;

describe("presetFor", () => {
  it("finds the preset whose weights match", () => {
    expect(presetFor(defaultWeights, configCatalog.presets)?.label).toBe("Max PPF with PBT");
    const second = configCatalog.presets[1];
    expect(presetFor(second.weights as typeof defaultWeights, configCatalog.presets)?.id).toBe(
      second.id,
    );
  });

  it("returns null for custom weights, and matches again when they go back", () => {
    const custom = { ...defaultWeights, pbt: 3 };
    expect(presetFor(custom, configCatalog.presets)).toBeNull();
    expect(presetFor({ ...custom, pbt: 4 }, configCatalog.presets)?.id).toBe("max_ppf_with_pbt");
  });
});

describe("weightShares", () => {
  it("gives each weight's percent of the total", () => {
    expect(weightShares(defaultWeights)).toEqual({
      ppf: 25,
      pbt: 20,
      pbtBreached: 25,
      pbtRisk: 15,
      largeOrders: 5,
      skuConsolidation: 10,
    });
  });

  it("gives 0 for every weight when they are all 0", () => {
    const zero = {
      ppf: 0,
      pbt: 0,
      pbtBreached: 0,
      pbtRisk: 0,
      largeOrders: 0,
      skuConsolidation: 0,
    };
    expect(Object.values(weightShares(zero))).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
