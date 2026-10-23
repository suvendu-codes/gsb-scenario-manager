import { describe, expect, it } from "vitest";

import { buildDefaults } from "../defaults";
import { getAtPath, hasPath, resolveConfig } from "../paths";
import {
  configValuesSchema,
  operationsCatalog,
  operationsCatalogSchema,
  SCHEDULER_WEIGHTS,
} from "../schema";
import type { CatalogField } from "../types";
import { configCatalog, STATION_IDS } from "./index";
import operationsJson from "./operations.json";
import { configCatalogSchema } from "./schema";

const defaults = buildDefaults();
const STATION = "PPS-101";

/** The catalog's fields with their `{stationId}` filled in, so they can be looked up. */
const fields: CatalogField[] = configCatalog.modules
  .flatMap((module) => module.sections)
  .flatMap((section) => section.fields)
  .map((field) => ({ ...field, path: field.path.replace("{stationId}", STATION) }));

/** True when the schema accepts the defaults with this one value changed. */
function accepts(path: string, value: unknown): boolean {
  return configValuesSchema.safeParse(resolveConfig(defaults, { [path]: value })).success;
}

describe("defaults", () => {
  it("are valid for the schema", () => {
    expect(configValuesSchema.safeParse(defaults).success).toBe(true);
  });

  it("have an entry for every station of the catalog", () => {
    expect(Object.keys(defaults.station.stations)).toEqual([...STATION_IDS]);
  });

  it("start every pick and audit field on the default the catalog declares", () => {
    const station = defaults.station.stations[STATION];
    expect(station.operations.pick.binStructure).toBe(operationsCatalog.pick.binStructure.default);
    for (const group of operationsCatalog.pick.groups) {
      for (const field of group.fields) {
        expect(station.operations.pick[field.key], field.key).toBe(field.default);
      }
    }
    for (const field of operationsCatalog.audit.fields) {
      expect(station.operations.audit[field.key], field.key).toBe(field.default);
    }
  });

  it("start put on the put defaults the catalog declares", () => {
    expect(defaults.station.stations[STATION].operations.put).toEqual(
      operationsCatalog.put.defaults,
    );
  });
});

describe("declared operations defaults", () => {
  /** A copy of the generated catalog that `change` can edit. */
  function catalogWith(change: (json: typeof operationsJson) => void) {
    const copy = structuredClone(operationsJson);
    change(copy);
    return operationsCatalogSchema.safeParse(copy);
  }

  it("are accepted for the generated catalog", () => {
    expect(operationsCatalogSchema.safeParse(operationsJson).success).toBe(true);
  });

  it("every choice's default is one of its options", () => {
    const choices = operationsCatalog.pick.groups
      .flatMap((g) => g.fields)
      .filter((f) => f.type === "choice");
    expect(choices.length).toBeGreaterThan(0);
    for (const field of choices) {
      expect(
        field.options.map((o) => o.value),
        field.key,
      ).toContain(field.default);
    }
  });

  it("rejects a choice default that is not one of its options", () => {
    const result = catalogWith((json) => {
      const field = json.pick.groups[0].fields[0];
      field.default = "no-such-option";
    });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toMatch(/is not one of its options/);
  });

  it("rejects a bin structure default that is not one of its options", () => {
    expect(
      catalogWith((json) => {
        json.pick.binStructure.default = "nope";
      }).success,
    ).toBe(false);
  });

  it("rejects put defaults that name a flow or category that does not exist", () => {
    expect(
      catalogWith((json) => {
        json.put.defaults.behavior.back = "no-such-flow";
      }).success,
    ).toBe(false);
    expect(
      catalogWith((json) => {
        json.put.defaults.behavior.front = "staged-tote-put-back";
      }).success,
    ).toBe(false);
    expect(
      catalogWith((json) => {
        json.put.defaults.category = "nope";
      }).success,
    ).toBe(false);
    expect(
      catalogWith((json) => {
        json.put.defaults.followUp.back = "Nope";
      }).success,
    ).toBe(false);
  });

  it("keeps working when the options are reordered, because the default is declared", () => {
    const reordered = structuredClone(operationsJson);
    const field = reordered.pick.groups[0].fields.find((f) => f.type === "choice");
    if (!field || field.type !== "choice") throw new Error("no choice field");
    const declared = field.default;
    field.options.reverse();
    const parsed = operationsCatalogSchema.parse(reordered);
    const same = parsed.pick.groups[0].fields.find((f) => f.key === field.key);
    expect(same?.type === "choice" && same.default).toBe(declared);
  });
});

describe("catalog", () => {
  it("is valid for its own schema", () => {
    expect(configCatalogSchema.safeParse(configCatalog).success).toBe(true);
  });

  it("has unique field paths", () => {
    const paths = fields.map((field) => field.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("matches the scheduler presets to the weight keys", () => {
    for (const preset of configCatalog.presets) {
      expect(Object.keys(preset.weights).sort()).toEqual([...SCHEDULER_WEIGHTS].sort());
    }
    const [first] = configCatalog.presets;
    expect(first.weights).toEqual(defaults.station.global.pickScheduler.weights);
  });

  it("has operations options with unique values", () => {
    const choices = operationsCatalog.pick.groups
      .flatMap((group) => group.fields)
      .filter((field) => field.type === "choice");
    for (const field of choices) {
      const values = field.options.map((option) => option.value);
      expect(new Set(values).size, field.key).toBe(values.length);
    }
  });

  it("only gives hardware fields to stations that have the hardware", () => {
    const hardware = fields.filter((field) => field.stationFeature);
    expect(hardware.length).toBeGreaterThan(0);
    expect(configCatalog.stations.some((s) => s.hasGravityInduction)).toBe(true);
    expect(configCatalog.stations.some((s) => s.hasEasyLoop)).toBe(true);
  });
});

describe("every catalog field", () => {
  it.each(fields.map((field) => [field.path, field] as const))(
    "%s exists in the defaults",
    (_p, f) => {
      expect(hasPath(defaults, f.path)).toBe(true);
      if (f.visibleWhen)
        expect(hasPath(defaults, f.visibleWhen.path.replace("{stationId}", STATION))).toBe(true);
      if (f.type === "stepper" && f.maxPath) {
        expect(hasPath(defaults, f.maxPath.replace("{stationId}", STATION))).toBe(true);
      }
    },
  );

  const numeric = fields.filter((f) => f.type === "stepper" || f.type === "hour");
  it.each(numeric.map((field) => [field.path, field] as const))(
    "%s: the schema accepts min and max and rejects values outside",
    (_p, f) => {
      if (f.type !== "stepper" && f.type !== "hour") return;
      expect(accepts(f.path, f.min), "min").toBe(true);
      expect(accepts(f.path, f.max), "max").toBe(true);
      expect(accepts(f.path, f.min - (f.type === "stepper" ? (f.step ?? 1) : 1)), "below").toBe(
        false,
      );
      expect(accepts(f.path, f.max + (f.type === "stepper" ? (f.step ?? 1) : 1)), "above").toBe(
        false,
      );
    },
  );

  const choices = fields.filter((f) => f.type === "choice");
  it.each(choices.map((field) => [field.path, field] as const))(
    "%s: the schema accepts every option and rejects others",
    (_p, f) => {
      if (f.type !== "choice") return;
      for (const option of f.options)
        expect(accepts(f.path, option.value), option.value).toBe(true);
      expect(accepts(f.path, "not-an-option")).toBe(false);
    },
  );

  it("wms.orderTypes: the schema accepts every option", () => {
    const field = fields.find((f) => f.type === "multiCheck");
    if (field?.type !== "multiCheck") throw new Error("no multiCheck field");
    for (const option of field.options) expect(accepts(field.path, [option.value])).toBe(true);
    expect(accepts(field.path, ["nope"])).toBe(false);
  });

  it("the weights field covers every weight within its range", () => {
    const field = fields.find((f) => f.type === "weights");
    if (field?.type !== "weights") throw new Error("no weights field");
    expect(field.items.map((item) => item.key)).toEqual([...SCHEDULER_WEIGHTS]);
    for (const item of field.items) {
      const path = `${field.path}.${item.key}`;
      expect(getAtPath(defaults, path)).toBeTypeOf("number");
      expect(accepts(path, field.min)).toBe(true);
      expect(accepts(path, field.max)).toBe(true);
      expect(accepts(path, field.max + 1)).toBe(false);
    }
  });
});
