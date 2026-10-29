import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import { configValuesSchema } from "../schema";
import type { ConfigValues, ScheduleBlock } from "../types";
import { validateConfig } from "../validation";
import {
  BACK_SEATS,
  copySchedule,
  followers,
  keepingOwn,
  revertToShared,
  sharedBlocks,
  sharedStructureId,
  stationIds,
  updateStations,
  writeGroupSchedule,
  writeGroupStructure,
  writeStationSchedule,
  writeStationStructure,
} from "./station-edits";

const ALL = ["PPS-101", "PPS-102", "PPS-103", "PPS-104", "PPS-105", "PPS-106"];

function blocks(...parts: Array<[number, ScheduleBlock["mode"]]>): ScheduleBlock[] {
  return parts.map(([hours, mode]) => ({ hours, mode, breaks: [] }));
}

const schedule = (config: ConfigValues, id: string) => config.station.stations[id].schedule;
const structure = (config: ConfigValues, id: string) => config.station.stations[id].structure;

/** Every sample station on one 8h pick schedule. */
function sharedConfig(): ConfigValues {
  return copySchedule(buildDefaults(), "PPS-106", ALL);
}
const pickAll = () => schedule(sharedConfig(), "PPS-106");

function expectValid(config: ConfigValues): void {
  expect(configValuesSchema.safeParse(config).success).toBe(true);
  expect(validateConfig(config, 8)).toEqual([]);
}

describe("stationIds and updateStations", () => {
  it("lists the stations in the config's order", () => {
    expect(stationIds(buildDefaults())).toEqual(ALL);
  });

  it("does not change the config it is given", () => {
    const defaults = buildDefaults();
    const before = structuredClone(defaults);
    updateStations(defaults, ["PPS-101"], (station) => ({ ...station, schedule: [] }));
    writeGroupSchedule(defaults, ALL, blocks([8, "audit"]));
    expect(defaults).toEqual(before);
  });
});

describe("followers and keepingOwn", () => {
  it("is every station when they all share a value", () => {
    expect(followers(sharedConfig(), ALL, "schedule")).toEqual(ALL);
    expect(keepingOwn(sharedConfig(), ALL, "schedule")).toEqual([]);
  });

  it("is the largest set of equal values; the others keep their own", () => {
    let config = writeStationSchedule(sharedConfig(), "PPS-102", blocks([8, "audit"]));
    config = writeStationSchedule(config, "PPS-104", blocks([8, "put"]));
    expect(keepingOwn(config, ALL, "schedule")).toEqual(["PPS-102", "PPS-104"]);
    expect(followers(config, ALL, "schedule")).toEqual([
      "PPS-101",
      "PPS-103",
      "PPS-105",
      "PPS-106",
    ]);
  });

  it("in a two-station type, editing one station leaves the other following (review of #44)", () => {
    const defaults = sharedConfig();
    const pair = ["PPS-101", "PPS-102"];
    const config = writeStationSchedule(defaults, "PPS-101", blocks([8, "audit"]));

    expect(followers(config, pair, "schedule", defaults)).toEqual(["PPS-102"]);
    expect(keepingOwn(config, pair, "schedule", defaults)).toEqual(["PPS-101"]);
    // A type edit reaches the untouched station, and Reset gives the edited one the default back.
    expect(
      schedule(writeGroupSchedule(config, pair, blocks([8, "put"]), defaults), "PPS-102"),
    ).toEqual(blocks([8, "put"]));
    expect(
      schedule(revertToShared(config, pair, "PPS-101", "schedule", defaults), "PPS-101"),
    ).toEqual(pickAll());
  });

  it("breaks a tie in favour of the earliest station when neither is on its defaults", () => {
    const config = writeStationSchedule(sharedConfig(), "PPS-102", blocks([8, "audit"]));
    expect(followers(config, ["PPS-102", "PPS-101"], "schedule")).toEqual(["PPS-102"]);
  });

  it("is computed per group, so a station can follow one group and not another", () => {
    const config = writeStationSchedule(sharedConfig(), "PPS-102", blocks([8, "audit"]));
    expect(keepingOwn(config, ALL, "schedule")).toEqual(["PPS-102"]);
    expect(keepingOwn(config, ["PPS-102"], "schedule")).toEqual([]);
  });

  it("is nothing for an empty group", () => {
    expect(followers(sharedConfig(), [], "schedule")).toEqual([]);
    expect(sharedBlocks(sharedConfig(), [])).toBeNull();
    expect(sharedStructureId(sharedConfig(), [])).toBeNull();
  });
});

describe("group schedule edits", () => {
  it("change the stations that share the schedule and skip the ones that keep their own", () => {
    const edited = blocks([4, "put"], [4, "audit"]);
    let config = writeStationSchedule(sharedConfig(), "PPS-103", blocks([8, "audit"]));
    config = writeGroupSchedule(config, ALL, edited);

    expect(schedule(config, "PPS-101")).toEqual(edited);
    expect(schedule(config, "PPS-106")).toEqual(edited);
    expect(schedule(config, "PPS-103")).toEqual(blocks([8, "audit"]));
    expectValid(config);
  });

  it("only reach the group's stations", () => {
    const config = writeGroupSchedule(sharedConfig(), ["PPS-101", "PPS-102"], blocks([8, "put"]));
    expect(schedule(config, "PPS-103")).toEqual(pickAll());
  });

  it("shows the shared schedule of the group", () => {
    const config = writeStationSchedule(sharedConfig(), "PPS-103", blocks([8, "audit"]));
    expect(sharedBlocks(config, ALL)).toEqual(pickAll());
  });

  it("copySchedule gives every station of the group one schedule", () => {
    const config = copySchedule(buildDefaults(), "PPS-101", ALL);
    for (const id of ALL)
      expect(schedule(config, id)).toEqual(schedule(buildDefaults(), "PPS-101"));
    expect(keepingOwn(config, ALL, "schedule")).toEqual([]);
    expectValid(config);
  });
});

describe("a station keeping its own schedule", () => {
  it("rejoins its group as soon as its schedule matches again", () => {
    let config = writeStationSchedule(sharedConfig(), "PPS-102", blocks([8, "audit"]));
    expect(keepingOwn(config, ALL, "schedule")).toEqual(["PPS-102"]);
    config = writeStationSchedule(config, "PPS-102", pickAll());
    expect(keepingOwn(config, ALL, "schedule")).toEqual([]);
  });

  it("revertToShared gives it the schedule the rest of its group shares", () => {
    let config = writeStationSchedule(sharedConfig(), "PPS-102", blocks([8, "audit"]));
    config = revertToShared(config, ALL, "PPS-102", "schedule");
    expect(schedule(config, "PPS-102")).toEqual(pickAll());
    expect(keepingOwn(config, ALL, "schedule")).toEqual([]);
  });

  it("revertToShared changes nothing for a station alone in its group", () => {
    const config = sharedConfig();
    expect(revertToShared(config, ["PPS-102"], "PPS-102", "schedule")).toBe(config);
  });
});

describe("structure", () => {
  it("a group edit sets every station that shares the structure", () => {
    const config = writeGroupStructure(buildDefaults(), ALL, { backOperator: "shuttle" });
    for (const id of ALL) expect(structure(config, id).backOperator).toBe("shuttle");
    expectValid(config);
  });

  it("a station that differs keeps its own and is skipped by group edits", () => {
    let config = writeStationStructure(buildDefaults(), "PPS-102", { frontOperation: "dual" });
    expect(keepingOwn(config, ALL, "structure")).toEqual(["PPS-102"]);
    config = writeGroupStructure(config, ALL, { pickingDestination: "packing_box" });
    expect(structure(config, "PPS-101").pickingDestination).toBe("packing_box");
    expect(structure(config, "PPS-102").pickingDestination).toBe("tote");
  });

  it("revertToShared copies the shared structure back", () => {
    let config = writeStationStructure(buildDefaults(), "PPS-102", { frontOperation: "dual" });
    config = revertToShared(config, ALL, "PPS-102", "structure");
    expect(structure(config, "PPS-102").frontOperation).toBe("single");
    expect(keepingOwn(config, ALL, "structure")).toEqual([]);
  });

  it("names a station whose structure is the shared one", () => {
    const config = writeStationStructure(buildDefaults(), "PPS-101", { frontOperation: "dual" });
    expect(sharedStructureId(config, ALL)).toBe("PPS-102");
  });

  it("keeps staffed positions within the front positions and seats within what exists", () => {
    const config = writeStationStructure(buildDefaults(), "PPS-101", {
      frontPositions: 1,
      staffedFrontPositions: 2,
      staffedBackSeats: 5,
    });
    expect(structure(config, "PPS-101").staffedFrontPositions).toBe(1);
    expect(structure(config, "PPS-101").staffedBackSeats).toBe(BACK_SEATS);
  });
});
