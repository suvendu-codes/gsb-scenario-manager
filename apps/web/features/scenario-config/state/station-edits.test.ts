import { describe, expect, it } from "vitest";

import { buildDefaults } from "../defaults";
import { configValuesSchema } from "../schema";
import type { ConfigValues, ScheduleBlock } from "../types";
import { validateConfig } from "../validation";
import {
  applyStationSchedule,
  applyTargets,
  copyScheduleToAll,
  editableStations,
  markStationOverride,
  overriddenStations,
  revertStationSchedule,
  revertStationStructure,
  setSharedTargets,
  sharedBlocks,
  sharedStructureId,
  updateStations,
  writeSharedSchedule,
  writeSharedStructure,
  writeStationSchedule,
  writeStationStructure,
} from "./station-edits";

const ALL = ["PPS-101", "PPS-102", "PPS-103", "PPS-104", "PPS-105", "PPS-106"];

function blocks(...parts: Array<[number, ScheduleBlock["mode"]]>): ScheduleBlock[] {
  return parts.map(([hours, mode]) => ({ hours, mode, teaBreaks: [] }));
}

const pickAll = blocks([8, "pick"]);
const schedule = (config: ConfigValues, id: string) => config.station.stations[id].schedule;
const structure = (config: ConfigValues, id: string) => config.station.stations[id].structure;

/** Every station on one 8h pick schedule, nobody keeping their own. */
function sharedConfig(): ConfigValues {
  return copyScheduleToAll(buildDefaults(), "PPS-106");
}

function expectValid(config: ConfigValues): void {
  expect(configValuesSchema.safeParse(config).success).toBe(true);
  expect(validateConfig(config, 8)).toEqual([]);
}

describe("targets and overrides", () => {
  const defaults = buildDefaults();

  it("targets every station and skips none by default", () => {
    expect(applyTargets(defaults, "schedule")).toEqual(ALL);
    expect(overriddenStations(defaults, "schedule")).toEqual([]);
    expect(editableStations(defaults, "structure")).toEqual(ALL);
  });

  it("skips stations that keep their own value", () => {
    const config = markStationOverride(
      markStationOverride(defaults, "schedule", "PPS-103"),
      "schedule",
      "PPS-101",
    );
    expect(overriddenStations(config, "schedule")).toEqual(["PPS-101", "PPS-103"]);
    expect(editableStations(config, "schedule")).toEqual([
      "PPS-102",
      "PPS-104",
      "PPS-105",
      "PPS-106",
    ]);
    expect(editableStations(config, "structure")).toEqual(ALL);
  });

  it("does not change the config it is given", () => {
    const before = structuredClone(defaults);
    markStationOverride(defaults, "schedule", "PPS-103");
    updateStations(defaults, ["PPS-101"], (station) => ({ ...station }));
    expect(defaults).toEqual(before);
  });
});

describe("shared schedule", () => {
  it("is null while the stations' schedules differ, and set once they match", () => {
    expect(sharedBlocks(buildDefaults(), ALL)).toBeNull();
    expect(sharedBlocks(sharedConfig(), ALL)).toEqual(pickAll);
    expect(sharedBlocks(sharedConfig(), [])).toBeNull();
  });

  it("copyScheduleToAll gives every station one schedule and clears the lists", () => {
    const start = setSharedTargets(
      markStationOverride(buildDefaults(), "schedule", "PPS-101"),
      "schedule",
      ["PPS-102", "PPS-103"],
    );
    const config = copyScheduleToAll(start, "PPS-102");

    for (const id of ALL)
      expect(schedule(config, id)).toEqual(schedule(buildDefaults(), "PPS-102"));
    expect(config.station.override.schedule).toEqual([]);
    expect(config.station.apply.schedule).toEqual([]);
    expectValid(config);
  });

  it("an All-stations schedule edit changes every station without its own", () => {
    const edited = blocks([4, "put"], [4, "audit"]);
    let config = writeStationSchedule(sharedConfig(), "PPS-103", blocks([8, "off"]));
    expect(overriddenStations(config, "schedule")).toEqual(["PPS-103"]);

    config = writeSharedSchedule(config, edited);
    expect(schedule(config, "PPS-101")).toEqual(edited);
    expect(schedule(config, "PPS-106")).toEqual(edited);
    expect(schedule(config, "PPS-103")).toEqual(blocks([8, "off"]));
    expectValid(config);
  });
});

describe("a station keeping its own schedule", () => {
  it("is marked when it differs from what the others share", () => {
    const config = writeStationSchedule(sharedConfig(), "PPS-102", blocks([8, "off"]));
    expect(overriddenStations(config, "schedule")).toEqual(["PPS-102"]);
  });

  it("is marked when the others do not share a schedule at all", () => {
    const config = writeStationSchedule(buildDefaults(), "PPS-101", blocks([8, "audit"]));
    expect(overriddenStations(config, "schedule")).toEqual(["PPS-101"]);
  });

  it("rejoins when its schedule is edited to match the shared one", () => {
    let config = writeStationSchedule(sharedConfig(), "PPS-102", blocks([8, "off"]));
    config = writeStationSchedule(config, "PPS-102", pickAll);
    expect(overriddenStations(config, "schedule")).toEqual([]);
  });

  it("revertStationSchedule makes it follow the shared schedule again", () => {
    let config = writeStationSchedule(sharedConfig(), "PPS-102", blocks([8, "off"]));
    config = revertStationSchedule(config, "PPS-102")!;
    expect(schedule(config, "PPS-102")).toEqual(pickAll);
    expect(overriddenStations(config, "schedule")).toEqual([]);
  });

  it("revertStationSchedule returns null when the others share nothing", () => {
    expect(revertStationSchedule(buildDefaults(), "PPS-101")).toBeNull();
  });

  it("applyStationSchedule copies one schedule to chosen stations, or to all", () => {
    const base = writeStationSchedule(buildDefaults(), "PPS-101", blocks([8, "audit"]));
    const some = applyStationSchedule(base, "PPS-101", ["PPS-104", "PPS-105"]);
    expect(schedule(some, "PPS-104")).toEqual(blocks([8, "audit"]));
    expect(schedule(some, "PPS-102")).toEqual(schedule(buildDefaults(), "PPS-102"));
    expect(overriddenStations(some, "schedule")).toEqual(["PPS-101"]);

    const all = applyStationSchedule(some, "PPS-101", []);
    for (const id of ALL) expect(schedule(all, id)).toEqual(blocks([8, "audit"]));
    expect(overriddenStations(all, "schedule")).toEqual([]);
  });
});

describe("choosing which stations an All-stations edit targets", () => {
  it("narrows the targets, and means all when none or all are chosen", () => {
    let config = setSharedTargets(sharedConfig(), "schedule", ["PPS-103", "PPS-101"]);
    expect(config.station.apply.schedule).toEqual(["PPS-101", "PPS-103"]);
    expect(editableStations(config, "schedule")).toEqual(["PPS-101", "PPS-103"]);

    config = writeSharedSchedule(config, blocks([8, "put"]));
    expect(schedule(config, "PPS-101")).toEqual(blocks([8, "put"]));
    expect(schedule(config, "PPS-102")).toEqual(pickAll);

    expect(setSharedTargets(config, "schedule", ALL).station.apply.schedule).toEqual([]);
    expect(setSharedTargets(config, "schedule", []).station.apply.schedule).toEqual([]);
  });

  it("a station that joins targets with no shared schedule keeps its own, still marked", () => {
    let config = setSharedTargets(sharedConfig(), "schedule", ["PPS-101", "PPS-102"]);
    config = writeStationSchedule(config, "PPS-101", blocks([8, "put"]));
    config = writeStationSchedule(config, "PPS-102", blocks([8, "audit"]));
    config = writeStationSchedule(config, "PPS-104", blocks([4, "put"], [4, "audit"]));
    expect(sharedBlocks(config, editableStations(config, "schedule"))).toBeNull();

    config = setSharedTargets(config, "schedule", ["PPS-101", "PPS-102", "PPS-104"]);

    expect(schedule(config, "PPS-104")).toEqual(blocks([4, "put"], [4, "audit"]));
    expect(overriddenStations(config, "schedule")).toContain("PPS-104");
    expect(writeSharedSchedule(config, pickAll).station.stations["PPS-104"].schedule).toEqual(
      blocks([4, "put"], [4, "audit"]),
    );
  });

  it("a station that joins the targets takes the shared schedule and loses its own", () => {
    let config = setSharedTargets(sharedConfig(), "schedule", ["PPS-101", "PPS-102"]);
    config = writeSharedSchedule(config, blocks([8, "put"]));
    config = writeStationSchedule(config, "PPS-104", blocks([8, "audit"]));
    expect(overriddenStations(config, "schedule")).toContain("PPS-104");

    config = setSharedTargets(config, "schedule", ["PPS-101", "PPS-102", "PPS-104"]);
    expect(schedule(config, "PPS-104")).toEqual(blocks([8, "put"]));
    expect(overriddenStations(config, "schedule")).not.toContain("PPS-104");
  });
});

describe("structure", () => {
  it("an All-stations edit sets every station", () => {
    const config = writeSharedStructure(buildDefaults(), { frontOperation: "dual" });
    for (const id of ALL) expect(structure(config, id).frontOperation).toBe("dual");
    expect(sharedStructureId(config)).toBe("PPS-101");
    expectValid(config);
  });

  it("a station that differs keeps its own and is skipped by All-stations edits", () => {
    let config = writeSharedStructure(buildDefaults(), { frontOperation: "dual" });
    config = writeStationStructure(config, "PPS-101", { frontOperation: "single" });
    expect(overriddenStations(config, "structure")).toEqual(["PPS-101"]);

    config = writeSharedStructure(config, { backOperator: "shuttle" });
    expect(structure(config, "PPS-101").backOperator).toBe("manual");
    expect(structure(config, "PPS-102").backOperator).toBe("shuttle");
  });

  it("rejoins when edited to match the others", () => {
    let config = writeSharedStructure(buildDefaults(), { frontOperation: "dual" });
    config = writeStationStructure(config, "PPS-101", { frontOperation: "single" });
    config = writeStationStructure(config, "PPS-101", { frontOperation: "dual" });
    expect(overriddenStations(config, "structure")).toEqual([]);
  });

  it("revertStationStructure copies the shared structure back", () => {
    let config = writeSharedStructure(buildDefaults(), { frontOperation: "dual" });
    config = writeStationStructure(config, "PPS-101", {
      frontOperation: "single",
      backOperator: "shuttle",
    });
    config = revertStationStructure(config, "PPS-101")!;
    expect(structure(config, "PPS-101")).toEqual(structure(config, "PPS-102"));
    expect(overriddenStations(config, "structure")).toEqual([]);
  });

  it("revertStationStructure returns null when the others differ", () => {
    // Edits that bypass override tracking leave the editable stations disagreeing.
    const config = updateStations(buildDefaults(), ["PPS-102"], (station) => ({
      ...station,
      structure: { ...station.structure, backOperator: "shuttle" },
    }));
    expect(sharedStructureId(config)).toBeNull();
    expect(revertStationStructure(config, "PPS-101")).toBeNull();
  });

  it("keeps staffed positions within the front positions", () => {
    let config = writeSharedStructure(buildDefaults(), {
      frontPositions: 2,
      staffedFrontPositions: 2,
    });
    expect(structure(config, "PPS-101")).toMatchObject({
      frontPositions: 2,
      staffedFrontPositions: 2,
    });

    config = writeSharedStructure(config, { frontPositions: 1 });
    expect(structure(config, "PPS-101")).toMatchObject({
      frontPositions: 1,
      staffedFrontPositions: 1,
    });
    expectValid(config);
  });

  it("joining the targets copies the shared structure", () => {
    let config = setSharedTargets(buildDefaults(), "structure", ["PPS-101", "PPS-102"]);
    config = writeSharedStructure(config, { backOperator: "shuttle" });
    expect(structure(config, "PPS-103").backOperator).toBe("manual");

    config = setSharedTargets(config, "structure", ["PPS-101", "PPS-102", "PPS-103"]);
    expect(structure(config, "PPS-103").backOperator).toBe("shuttle");
  });
});
