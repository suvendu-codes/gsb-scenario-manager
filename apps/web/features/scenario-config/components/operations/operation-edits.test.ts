import { describe, expect, it } from "vitest";

import { buildDefaults } from "../../defaults";
import { configValuesSchema } from "../../schema";
import { operationPath, setOperationValue } from "./operation-edits";

const defaults = buildDefaults();

describe("operationPath", () => {
  it("builds the path of a setting, or of a whole mode", () => {
    expect(operationPath("PPS-101", "pick", "pickSlop")).toBe(
      "station.stations.PPS-101.operations.pick.pickSlop",
    );
    expect(operationPath("PPS-102", "put")).toBe("station.stations.PPS-102.operations.put");
  });
});

describe("setOperationValue", () => {
  it("sets a pick choice on the listed stations only", () => {
    const next = setOperationValue(
      defaults,
      ["PPS-101", "PPS-103"],
      "pick",
      "pickStrategy",
      "staged-parallel",
    );

    expect(next.station.stations["PPS-101"].operations.pick.pickStrategy).toBe("staged-parallel");
    expect(next.station.stations["PPS-103"].operations.pick.pickStrategy).toBe("staged-parallel");
    expect(next.station.stations["PPS-102"].operations.pick.pickStrategy).toBe("sequential");
  });

  it("sets an audit toggle and keeps the other settings", () => {
    const next = setOperationValue(defaults, ["PPS-104"], "audit", "auditZeroConf", true);

    expect(next.station.stations["PPS-104"].operations.audit).toEqual({
      ...defaults.station.stations["PPS-104"].operations.audit,
      auditZeroConf: true,
    });
    expect(next.station.stations["PPS-104"].operations.pick).toEqual(
      defaults.station.stations["PPS-104"].operations.pick,
    );
  });

  it("produces a config the schema accepts, and does not change its input", () => {
    const before = structuredClone(defaults);
    const next = setOperationValue(defaults, ["PPS-101"], "pick", "pickSlop", true);

    expect(configValuesSchema.safeParse(next).success).toBe(true);
    expect(defaults).toEqual(before);
  });
});
