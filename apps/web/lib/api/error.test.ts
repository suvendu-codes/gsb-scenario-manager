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
