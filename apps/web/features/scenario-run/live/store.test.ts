import { describe, expect, it } from "vitest";

import { startSession } from "./session";
import { parseStoredSession } from "./store";

describe("parseStoredSession (review of #52)", () => {
  it("reads a session in today's shape", () => {
    const session = { ...startSession("x", 1000), changes: [{ kind: "bots", atH: 1, bots: 22 }] };
    expect(parseStoredSession(JSON.stringify(session))).toEqual(session);
  });

  it("drops a session from an older build, a bad change, or text that isn't JSON", () => {
    const old: Record<string, unknown> = { ...startSession("x", 1000) };
    delete old.changes;
    expect(parseStoredSession(JSON.stringify(old))).toBeNull();
    expect(
      parseStoredSession(JSON.stringify({ ...startSession("x", 1), changes: [{ kind: "bots" }] })),
    ).toBeNull();
    expect(parseStoredSession("{not json")).toBeNull();
  });
});
