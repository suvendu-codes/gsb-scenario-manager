import { describe, expect, it } from "vitest";

import { parseErrorBody, summarizeProblems } from "./error";

describe("parseErrorBody", () => {
  it("accepts the envelope with and without the optional parts", () => {
    expect(parseErrorBody({ code: "X", message: "x" })).toEqual({ code: "X", message: "x" });
    const full = {
      code: "THING_INVALID",
      message: "Not valid",
      params: { id: "7", n: 2, ok: false },
      path: "a.b",
      problems: [{ code: "Y", message: "y", path: "a.b.c" }],
    };
    expect(parseErrorBody(full)).toEqual(full);
  });

  it("rejects a body that does not follow it", () => {
    expect(parseErrorBody({ message: "only a message" })).toBeNull();
    expect(parseErrorBody({ code: 5, message: "x" })).toBeNull();
    expect(parseErrorBody({ code: "X", message: "x", params: { a: { nested: 1 } } })).toBeNull();
    expect(
      parseErrorBody({ code: "X", message: "x", problems: [{ message: "no code" }] }),
    ).toBeNull();
    expect(parseErrorBody("oops")).toBeNull();
    expect(parseErrorBody(null)).toBeNull();
  });
});

describe("parseErrorBody: nested error shape", () => {
  it("reads code, message and request id", () => {
    expect(
      parseErrorBody({
        error: { code: "not_found", message: "No such scenario", request_id: "r-1" },
      }),
    ).toEqual({ code: "not_found", message: "No such scenario", requestId: "r-1" });
  });

  it("turns details.errors into problems with their paths", () => {
    const body = {
      error: {
        code: "validation_failed",
        message: "2 fields are invalid",
        details: {
          errors: [
            { path: "wms.volume_multiplier", reason: "out_of_range", max: 2.5 },
            { reason: "missing" },
          ],
        },
      },
    };
    expect(parseErrorBody(body)).toEqual({
      code: "validation_failed",
      message: "2 fields are invalid",
      problems: [
        {
          code: "out_of_range",
          message: "wms.volume_multiplier: out_of_range",
          params: { max: 2.5 },
          path: "wms.volume_multiplier",
        },
        { code: "missing", message: "missing" },
      ],
    });
  });

  it("turns details.issues into problems and other scalar details into params", () => {
    const body = {
      error: {
        code: "scenario_invalid",
        message: "Not ready",
        details: { scenario_id: "s-1", issues: [{ code: "no_dataset", message: "Attach one" }] },
      },
    };
    expect(parseErrorBody(body)).toEqual({
      code: "scenario_invalid",
      message: "Not ready",
      params: { scenario_id: "s-1" },
      problems: [{ code: "no_dataset", message: "Attach one" }],
    });
  });

  it("skips detail entries it cannot read and rejects a body without code and message", () => {
    const body = { error: { code: "x", message: "y", details: { errors: ["bad", 3] } } };
    expect(parseErrorBody(body)).toEqual({ code: "x", message: "y" });
    expect(parseErrorBody({ error: { message: "no code" } })).toBeNull();
    expect(parseErrorBody({ error: "text" })).toBeNull();
  });
});

describe("summarizeProblems", () => {
  const problem = (message: string) => ({ code: "X", message });

  it("is the message of a single problem", () => {
    expect(summarizeProblems([problem("First")])).toBe("First");
  });

  it("adds how many more there are", () => {
    expect(summarizeProblems([problem("First"), problem("Second")])).toBe(
      "First (and 1 more problem)",
    );
    expect(summarizeProblems([problem("First"), problem("B"), problem("C")])).toBe(
      "First (and 2 more problems)",
    );
  });
});
