import { describe, expect, it } from "vitest";
import { z } from "zod";

import { relax, scenarioConfigResponseSchema } from "./response-schemas";
import { buildDefaults } from "@/lib/mock/defaults";
import { scenarioConfigSchema } from "./schema";
import { resizeBlock } from "./state/schedule-blocks";

const leaf = z.object({ n: z.number().min(0) }).strict();
const nested = z
  .object({
    inner: leaf,
    list: z.array(leaf),
    byId: z.record(z.string(), leaf),
    maybe: leaf.optional(),
    orNull: leaf.nullable(),
    either: z.union([leaf, z.string()]),
    kind: z.discriminatedUnion("type", [
      z.object({ type: z.literal("a"), a: z.number() }).strict(),
      z.object({ type: z.literal("b") }).strict(),
    ]),
  })
  .strict();

const sample = {
  inner: { n: 1 },
  list: [{ n: 2 }],
  byId: { x: { n: 3 } },
  maybe: { n: 4 },
  orNull: { n: 5 },
  either: { n: 6 },
  kind: { type: "a", a: 7 },
};

/** `value` with an unknown key added to every object in it. */
function withExtra(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withExtra);
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, child]) => [key, withExtra(child)]);
    return { ...Object.fromEntries(entries), extra: 1 };
  }
  return value;
}

describe("relax", () => {
  it("drops unknown keys outside arrays instead of rejecting them, and keeps them inside", () => {
    const extra = withExtra(sample) as Record<string, unknown>;
    // The record gets an "extra" entry too; that one is a value, so it is still checked.
    delete (extra.byId as Record<string, unknown>).extra;

    expect(nested.safeParse(extra).success).toBe(false);
    // Arrays are written back whole, so their items keep fields the client doesn't know.
    expect(relax(nested).parse(extra)).toEqual({ ...sample, list: [{ n: 2, extra: 1 }] });
  });

  it("still checks values, enums and discriminators", () => {
    const relaxed = relax(nested);
    expect(relaxed.safeParse({ ...sample, inner: { n: -1 } }).success).toBe(false);
    expect(relaxed.safeParse({ ...sample, list: [{ n: "2" }] }).success).toBe(false);
    expect(relaxed.safeParse({ ...sample, kind: { type: "c" } }).success).toBe(false);
    expect(relaxed.safeParse({ ...sample, byId: { x: { n: -3 } } }).success).toBe(false);
  });

  it("keeps refinements", () => {
    const refined = leaf.refine((value) => value.n !== 13, "not 13");
    expect(relax(refined).safeParse({ n: 13, extra: 1 }).success).toBe(false);
    expect(relax(refined).parse({ n: 12, extra: 1 })).toEqual({ n: 12 });
  });

  it("leaves the schema it was given strict", () => {
    relax(nested);
    expect(nested.safeParse(withExtra(sample)).success).toBe(false);
  });

  it("keeps a field the server adds to a schedule block through an edit (round trip)", () => {
    const config = buildDefaults();
    const id = Object.keys(config.station.stations)[0];
    const body = {
      scenarioId: "s",
      runDurationHours: 8,
      defaults: config,
      overrides: {},
      issues: [],
    } as Record<string, unknown>;
    const schedule = config.station.stations[id].schedule as Array<Record<string, unknown>>;
    schedule[0] = { ...schedule[0], addedLater: "kept" };

    const read = scenarioConfigResponseSchema.parse(body);
    const blocks = read.defaults.station.stations[id].schedule;
    expect(blocks[0]).toHaveProperty("addedLater", "kept");

    // What the editor writes back for that schedule still carries the field.
    const edited = blocks.length > 1 ? resizeBlock(blocks, 0, blocks[0].hours + 0.5) : blocks;
    expect(edited[0]).toHaveProperty("addedLater", "kept");
  });

  it("makes the config response tolerant where the internal schema is strict", () => {
    const wms = scenarioConfigSchema.shape.defaults.shape.wms;
    const responseWms = scenarioConfigResponseSchema.shape.defaults.shape.wms;
    expect(wms._def.unknownKeys).toBe("strict");
    expect(responseWms._def.unknownKeys).toBe("strip");
  });
});
