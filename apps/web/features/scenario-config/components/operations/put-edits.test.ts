import { describe, expect, it } from "vitest";

import { configCatalog } from "../../catalog";
import { buildDefaults } from "../../defaults";
import { configValuesSchema, putConfigSchema } from "../../schema";
import { validateConfig } from "../../validation";
import {
  changeCategory,
  changeFlow,
  changeFollowUp,
  changeSides,
  putFlowsFor,
  sharedPut,
  usedSides,
  type Put,
} from "./put-edits";

const catalog = configCatalog.operations;
const defaultPut = buildDefaults().station.stations["PPS-104"].operations.put;

/** True when a put value is valid for the schema and for the station rules. */
function isValid(put: Put): boolean {
  const config = buildDefaults();
  config.station.stations["PPS-104"].operations.put = put;
  return (
    putConfigSchema.safeParse(put).success &&
    configValuesSchema.safeParse(config).success &&
    validateConfig(config, 8).length === 0
  );
}

describe("putFlowsFor and usedSides", () => {
  it("lists the flows of a category side", () => {
    expect(putFlowsFor(catalog, "put", "back").map((f) => f.id)).toContain("staged-tote-put-back");
    expect(putFlowsFor(catalog, "put", "front").map((f) => f.id)).toContain("unstaged-put-front");
    expect(putFlowsFor(catalog, "induction", "back").length).toBeGreaterThan(0);
    expect(putFlowsFor(catalog, "induction", "front")).toEqual([]);
    expect(putFlowsFor(catalog, "nope", "back")).toEqual([]);
  });

  it("uses the chosen sides for Put and only the back for the other categories", () => {
    expect(usedSides({ ...defaultPut, sides: ["front", "back"] })).toEqual(["front", "back"]);
    expect(usedSides({ ...defaultPut, category: "induction", sides: ["front"] })).toEqual(["back"]);
  });
});

describe("changeCategory", () => {
  it("starts each side on the first flow of the new category, back side only", () => {
    const induction = changeCategory(defaultPut, "induction", catalog);
    expect(induction.category).toBe("induction");
    expect(induction.sides).toEqual(["back"]);
    expect(induction.behavior.back).toBe("filled-tote-induction");
    expect(isValid(induction)).toBe(true);
  });

  it("asks the first answer of a flow's follow-up question", () => {
    // "Filled tote induction" asks how items are inducted (manual scan or gravity).
    expect(changeCategory(defaultPut, "induction", catalog).followUp.back).toBe("Manual");
    expect(changeCategory(defaultPut, "extraction", catalog).followUp.back).toBeNull();
  });

  it("goes back to the put flows when switching back to Put", () => {
    const back = changeCategory(changeCategory(defaultPut, "extraction", catalog), "put", catalog);
    expect(back.behavior).toEqual({ front: "unstaged-put-front", back: "no-expectation-put-back" });
    expect(isValid(back)).toBe(true);
  });
});

describe("changeSides", () => {
  it("keeps front before back and at least one side", () => {
    expect(changeSides(defaultPut, ["back", "front"]).sides).toEqual(["front", "back"]);
    expect(changeSides(defaultPut, ["front"]).sides).toEqual(["front"]);
    expect(changeSides(defaultPut, [])).toBe(defaultPut);
  });
});

describe("changeFlow and changeFollowUp", () => {
  it("sets the flow of one side and its starting follow-up answer", () => {
    const next = changeFlow(defaultPut, "back", "staged-rollcage-put-back", catalog);
    expect(next.behavior.back).toBe("staged-rollcage-put-back");
    expect(next.followUp.back).toBe("SD");
    expect(isValid(next)).toBe(true);
  });

  it("clears the follow-up when the new flow has no question", () => {
    const withQuestion = changeFlow(defaultPut, "back", "staged-rollcage-put-back", catalog);
    const without = changeFlow(withQuestion, "back", "staged-tote-put-back", catalog);
    expect(without.followUp.back).toBeNull();
  });

  it("changes only the side it is given", () => {
    const next = changeFlow(defaultPut, "back", "staged-tote-put-back", catalog);
    expect(next.behavior.front).toBe(defaultPut.behavior.front);
  });

  it("sets the follow-up answer", () => {
    const next = changeFollowUp(
      changeFlow(defaultPut, "back", "staged-rollcage-put-back", catalog),
      "back",
      "UD",
      catalog,
    );
    expect(next.followUp.back).toBe("UD");
    expect(isValid(next)).toBe(true);
  });

  it("ignores a flow the station's category does not offer", () => {
    const induction = changeCategory(defaultPut, "induction", catalog);
    expect(changeFlow(induction, "back", "staged-tote-put-back", catalog)).toBe(induction);
  });

  it("ignores an answer that is not an option of the station's own question", () => {
    const rollcage = changeFlow(defaultPut, "back", "staged-rollcage-put-back", catalog);
    const tote = changeFlow(defaultPut, "back", "staged-tote-put-back", catalog);
    expect(changeFollowUp(rollcage, "back", "Gravity", catalog)).toBe(rollcage);
    expect(changeFollowUp(tote, "back", "UD", catalog)).toBe(tote);
  });
});

describe("editing several stations' put settings together", () => {
  /** Defaults with each listed station's put settings changed by its recipe. */
  function configWith(puts: Record<string, (put: Put) => Put>) {
    const config = buildDefaults();
    for (const [id, recipe] of Object.entries(puts)) {
      const operations = config.station.stations[id].operations;
      operations.put = recipe(operations.put);
    }
    return config;
  }

  /** What an All-stations edit does: the same recipe for every target. */
  function editAll(
    config: ReturnType<typeof buildDefaults>,
    ids: string[],
    recipe: (put: Put) => Put,
  ) {
    const next = structuredClone(config);
    for (const id of ids) {
      const operations = next.station.stations[id].operations;
      operations.put = recipe(operations.put);
    }
    return next;
  }

  const putProblems = (config: ReturnType<typeof buildDefaults>) =>
    validateConfig(config, 8).filter((problem) => problem.code === "PUT_FLOW_NOT_ALLOWED");

  it("sees mixed categories, and a shared flow edit leaves the other category alone", () => {
    const config = configWith({
      "PPS-101": (put) => changeCategory(put, "put", catalog),
      "PPS-102": (put) => changeCategory(put, "induction", catalog),
    });
    const ids = ["PPS-101", "PPS-102"];
    expect(
      sharedPut(ids.map((id) => config.station.stations[id].operations.put)).category,
    ).toBeNull();

    const next = editAll(config, ids, (put) =>
      changeFlow(put, "back", "staged-tote-put-back", catalog),
    );

    expect(next.station.stations["PPS-101"].operations.put.behavior.back).toBe(
      "staged-tote-put-back",
    );
    expect(next.station.stations["PPS-102"].operations.put).toEqual(
      config.station.stations["PPS-102"].operations.put,
    );
    expect(putProblems(next)).toEqual([]);
  });

  it("sees mixed flows, and a shared answer only reaches stations whose flow asks it", () => {
    const config = configWith({
      "PPS-101": (put) =>
        changeFlow(
          changeCategory(put, "put", catalog),
          "back",
          "staged-rollcage-put-back",
          catalog,
        ),
      "PPS-102": (put) => changeCategory(put, "induction", catalog),
      "PPS-103": (put) =>
        changeFlow(changeCategory(put, "put", catalog), "back", "staged-tote-put-back", catalog),
    });
    const ids = ["PPS-101", "PPS-103"];
    const shared = sharedPut(ids.map((id) => config.station.stations[id].operations.put));
    expect(shared).toEqual({ category: "put", sameFlow: { front: true, back: false } });

    const next = editAll(config, ["PPS-101", "PPS-102", "PPS-103"], (put) =>
      changeFollowUp(put, "back", "UD", catalog),
    );

    expect(next.station.stations["PPS-101"].operations.put.followUp.back).toBe("UD");
    expect(next.station.stations["PPS-102"].operations.put.followUp.back).toBe("Manual");
    expect(next.station.stations["PPS-103"].operations.put.followUp.back).toBeNull();
    expect(configValuesSchema.safeParse(next).success).toBe(true);
    expect(putProblems(next)).toEqual([]);
  });

  it("agrees when every station has the same category and flows", () => {
    const put = changeCategory(defaultPut, "put", catalog);
    expect(sharedPut([put, structuredClone(put)])).toEqual({
      category: "put",
      sameFlow: { front: true, back: true },
    });
  });
});
