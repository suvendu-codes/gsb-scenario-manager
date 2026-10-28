import { beforeEach, describe, expect, it } from "vitest";

import type { ApiError } from "@/lib/api/errors";

import type { ConfigApi, MapRef } from "./api";
import { getAtPath, isLeafPath, isPlainObject, resolveConfig } from "./paths";
import type { ScenarioConfig, ScheduleBlock } from "./types";

/** What a contract run needs: a client, and scenario ids in the states the contract covers. */
export type ContractContext = {
  api: ConfigApi;
  /** A draft scenario. The suite resets its overrides before each test. */
  draftId: string;
  /** A scenario that exists but is not a draft (active or completed). */
  nonDraftId: string;
  /** An id no scenario has. */
  unknownId: string;
  /** A map with stations and bots. */
  map: MapRef;
  /** A map that does not exist in its project. */
  unknownMap: MapRef;
};

/**
 * Paths the contract writes to, in the client's dot-notation terms. They are the only part of
 * the suite that names fields, so a renamed field means changing this one object.
 */
export const CONTRACT_PATHS = {
  /** A number leaf, with a valid value other than its default and one out of range. */
  number: { path: "wms.volumeMultiplier", value: 2, outOfRange: 6 },
  /** A leaf in another module. */
  other: { path: "agent.fleet.htm", value: 12, outOfRange: -1 },
  /** A path that names a group of values, not one value. */
  group: "wms",
  /** A path that does not exist. */
  unknown: "wms.nope",
  /** The modules a config has; resetting one resets everything in it. */
  modules: ["wms", "station", "agent"],
} as const;

/** A station's schedule path: arrays like this are one value, written and read whole. */
const schedulePath = (stationId: string) => `station.stations.${stationId}.schedule`;

/**
 * Runs a call that must fail and returns its `ApiError`, failing the test if it succeeds. The
 * check is by shape: a client loaded after `vi.resetModules()` has its own `ApiError` class.
 */
async function failureOf(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call;
  } catch (error) {
    expect(error).toMatchObject({
      kind: "http",
      status: expect.any(Number),
      problems: expect.any(Array),
    });
    return error as ApiError;
  }
  throw new Error("expected the call to fail");
}

/** A 4xx error that names itself with a code and a message. */
function expectClientError(error: ApiError, status?: number): void {
  if (status === undefined) {
    expect(error.status).toBeGreaterThanOrEqual(400);
    expect(error.status).toBeLessThan(500);
  } else {
    expect(error.status).toBe(status);
  }
  expect(error.code).toEqual(expect.any(String));
  expect(error.message).toEqual(expect.any(String));
}

/** The paths named by an error's problems. */
const problemPaths = (error: ApiError) => error.problems.map((problem) => problem.path);

/**
 * The config API contract: what the config page relies on, in its own terms (flat dot-notation
 * overrides, `{ set, reset }` changes). It deliberately leaves out what the API may still change:
 * whether an override equal to its default is kept, the exact error codes and statuses beyond
 * 404 and 409, whether checks stop at the first kind of problem found (the mock checks paths,
 * then values, then rules across fields), and any version or timestamp fields.
 *
 * @param name - Names the implementation under test, e.g. "mock".
 * @param setup - Called before each test; returns the client and ids to use.
 */
export function describeConfigApiContract(
  name: string,
  setup: () => Promise<ContractContext>,
): void {
  describe(`config API contract: ${name}`, () => {
    let ctx: ContractContext;
    let initial: ScenarioConfig;

    beforeEach(async () => {
      ctx = await setup();
      initial = await ctx.api.getScenarioConfig(ctx.draftId);
      if (Object.keys(initial.overrides).length > 0) {
        initial = await ctx.api.patchScenarioConfig(ctx.draftId, {
          reset: [...CONTRACT_PATHS.modules],
        });
      }
    });

    /** The draft's effective config, read back with a fresh GET. */
    const resolved = async () => {
      const config = await ctx.api.getScenarioConfig(ctx.draftId);
      return resolveConfig(config.defaults, config.overrides);
    };

    /**
     * A schedule, different from the default, for the first station that has one: the whole run
     * in that station's first mode with no breaks. It keeps to a mode the station allows,
     * whatever its registry says.
     */
    const fullSchedule = (): { path: string; value: ScheduleBlock[] } => {
      const [stationId, station] = Object.entries(initial.defaults.station.stations).find(
        ([, candidate]) => candidate.schedule.length > 0,
      )!;
      const { mode } = station.schedule[0];
      return {
        path: schedulePath(stationId),
        value: [{ hours: initial.runDurationHours, mode, breaks: [] }],
      };
    };

    describe("catalog", () => {
      it("lists the modules, sections and fields the panel is built from", async () => {
        const catalog = await ctx.api.getCatalog();
        expect(catalog.modules.length).toBeGreaterThan(0);
      });
    });

    describe("map lookups", () => {
      it("lists the map's stations with ids that can be used in config paths", async () => {
        const { stations } = await ctx.api.getMapStations(ctx.map);

        expect(stations.length).toBeGreaterThan(0);
        const ids = stations.map((station) => station.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const station of stations) {
          expect(station.id).toMatch(/^[^.]+$/);
          for (const mode of station.allowedModes) expect(["pick", "put", "audit"]).toContain(mode);
        }
      });

      it("lists the map's bot types with whole counts of 0 or more", async () => {
        const { botTypes } = await ctx.api.getMapFleet(ctx.map);

        expect(botTypes.length).toBeGreaterThan(0);
        const keys = botTypes.map((bot) => bot.fleetKey);
        expect(new Set(keys).size).toBe(keys.length);
        for (const bot of botTypes) {
          expect(Number.isInteger(bot.count) && bot.count >= 0).toBe(true);
        }
      });

      it("accepts a map version without the client knowing what it means", async () => {
        const map = { ...ctx.map, mapVersion: "contract-test" };
        expect((await ctx.api.getMapStations(map)).stations.length).toBeGreaterThan(0);
        expect((await ctx.api.getMapFleet(map)).botTypes.length).toBeGreaterThan(0);
      });

      it("answers 404 with a code for a map that does not exist", async () => {
        expectClientError(await failureOf(ctx.api.getMapStations(ctx.unknownMap)), 404);
        expectClientError(await failureOf(ctx.api.getMapFleet(ctx.unknownMap)), 404);
      });
    });

    describe("GET config", () => {
      it("returns the scenario, its defaults per module, its overrides and its issues", async () => {
        const config = await ctx.api.getScenarioConfig(ctx.draftId);

        expect(config.scenarioId).toBe(ctx.draftId);
        for (const id of CONTRACT_PATHS.modules)
          expect(isPlainObject(config.defaults[id])).toBe(true);
        expect(isPlainObject(config.overrides)).toBe(true);
        for (const issue of config.issues) {
          expect(issue).toMatchObject({ code: expect.any(String), message: expect.any(String) });
        }
      });

      it("keys overrides by dot paths that each name one value in the defaults", async () => {
        const { number, other } = CONTRACT_PATHS;
        await ctx.api.patchScenarioConfig(ctx.draftId, {
          set: { [number.path]: number.value, [other.path]: other.value },
        });

        const config = await ctx.api.getScenarioConfig(ctx.draftId);
        expect(Object.keys(config.overrides).length).toBeGreaterThan(0);
        for (const path of Object.keys(config.overrides)) {
          expect(isLeafPath(config.defaults, path), path).toBe(true);
        }
      });

      it("has a draft with no overrides resolve to its defaults", () => {
        expect(initial.overrides).toEqual({});
        expect(resolveConfig(initial.defaults, initial.overrides)).toEqual(initial.defaults);
      });

      it("answers 404 with a code for an unknown scenario", async () => {
        expectClientError(await failureOf(ctx.api.getScenarioConfig(ctx.unknownId)), 404);
      });
    });

    describe("PATCH set", () => {
      it("changes the value a later GET resolves to", async () => {
        const { path, value } = CONTRACT_PATHS.number;
        const response = await ctx.api.patchScenarioConfig(ctx.draftId, { set: { [path]: value } });

        expect(getAtPath(resolveConfig(response.defaults, response.overrides), path)).toBe(value);
        expect(getAtPath(await resolved(), path)).toBe(value);
      });

      it("resolves a value set back to its default to the default, kept as an override or not", async () => {
        const { path, value } = CONTRACT_PATHS.number;
        const original = getAtPath(initial.defaults, path);
        await ctx.api.patchScenarioConfig(ctx.draftId, { set: { [path]: value } });
        await ctx.api.patchScenarioConfig(ctx.draftId, { set: { [path]: original } });

        expect(getAtPath(await resolved(), path)).toEqual(original);
      });

      it("writes and reads an array whole", async () => {
        const { path, value } = fullSchedule();
        await ctx.api.patchScenarioConfig(ctx.draftId, { set: { [path]: value } });

        expect(getAtPath(await resolved(), path)).toEqual(value);
      });
    });

    describe("PATCH reset", () => {
      beforeEach(async () => {
        const { number, other } = CONTRACT_PATHS;
        const schedule = fullSchedule();
        await ctx.api.patchScenarioConfig(ctx.draftId, {
          set: {
            [number.path]: number.value,
            [other.path]: other.value,
            [schedule.path]: schedule.value,
          },
        });
      });

      const paths = async () =>
        Object.keys((await ctx.api.getScenarioConfig(ctx.draftId)).overrides).sort();

      it("removes the override at one path and keeps the others", async () => {
        const { number, other } = CONTRACT_PATHS;
        await ctx.api.patchScenarioConfig(ctx.draftId, { reset: [number.path] });

        expect(await paths()).toEqual([other.path, fullSchedule().path].sort());
        expect(getAtPath(await resolved(), number.path)).toEqual(
          getAtPath(initial.defaults, number.path),
        );
      });

      it("removes every override under a prefix", async () => {
        await ctx.api.patchScenarioConfig(ctx.draftId, { reset: ["station.stations"] });

        expect(await paths()).toEqual(
          [CONTRACT_PATHS.number.path, CONTRACT_PATHS.other.path].sort(),
        );
      });

      it("removes a whole module", async () => {
        await ctx.api.patchScenarioConfig(ctx.draftId, { reset: ["agent"] });

        expect(await paths()).toEqual([CONTRACT_PATHS.number.path, fullSchedule().path].sort());
      });
    });

    describe("PATCH failures", () => {
      it("rejects an unknown path, with its path", async () => {
        const error = await failureOf(
          ctx.api.patchScenarioConfig(ctx.draftId, { set: { [CONTRACT_PATHS.unknown]: 1 } }),
        );
        expectClientError(error);
        expect(problemPaths(error)).toContain(CONTRACT_PATHS.unknown);
      });

      it("rejects a path that names a group of values", async () => {
        const error = await failureOf(
          ctx.api.patchScenarioConfig(ctx.draftId, { set: { [CONTRACT_PATHS.group]: {} } }),
        );
        expectClientError(error);
        expect(problemPaths(error)).toContain(CONTRACT_PATHS.group);
      });

      it("rejects a value out of range, with its path", async () => {
        const { path, outOfRange } = CONTRACT_PATHS.number;
        const error = await failureOf(
          ctx.api.patchScenarioConfig(ctx.draftId, { set: { [path]: outOfRange } }),
        );
        expectClientError(error);
        expect(problemPaths(error)).toContain(path);
      });

      it("rejects values that break a rule across fields", async () => {
        const { path, value } = fullSchedule();
        const tooShort: ScheduleBlock[] = [{ ...value[0], hours: 1 }];
        const error = await failureOf(
          ctx.api.patchScenarioConfig(ctx.draftId, { set: { [path]: tooShort } }),
        );
        expectClientError(error);
        expect(problemPaths(error)).toContain(path);
      });

      it("lists every invalid value of one change, each with a code and a message", async () => {
        const { number, other } = CONTRACT_PATHS;
        const error = await failureOf(
          ctx.api.patchScenarioConfig(ctx.draftId, {
            set: { [number.path]: number.outOfRange, [other.path]: other.outOfRange },
          }),
        );
        expect(problemPaths(error)).toEqual(expect.arrayContaining([number.path, other.path]));
        for (const problem of error.problems) {
          expect(problem).toMatchObject({ code: expect.any(String), message: expect.any(String) });
        }
      });

      it("stores nothing when any part of a change fails", async () => {
        const { number, other } = CONTRACT_PATHS;
        await failureOf(
          ctx.api.patchScenarioConfig(ctx.draftId, {
            set: { [other.path]: other.value, [number.path]: number.outOfRange },
          }),
        );

        expect((await ctx.api.getScenarioConfig(ctx.draftId)).overrides).toEqual({});
      });

      it("answers 409 with a code for a scenario that is not a draft", async () => {
        const { path, value } = CONTRACT_PATHS.other;
        expectClientError(
          await failureOf(ctx.api.patchScenarioConfig(ctx.nonDraftId, { set: { [path]: value } })),
          409,
        );
      });

      it("answers 404 with a code for an unknown scenario", async () => {
        const { path, value } = CONTRACT_PATHS.other;
        expectClientError(
          await failureOf(ctx.api.patchScenarioConfig(ctx.unknownId, { set: { [path]: value } })),
          404,
        );
      });
    });
  });
}
