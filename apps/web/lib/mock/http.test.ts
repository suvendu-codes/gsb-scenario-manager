import { describe, expect, it } from "vitest";

import { errorResponse, readJson } from "./http";
import { MockApiError } from "./store";

async function bodyOf(error: MockApiError): Promise<{ status: number; body: unknown }> {
  const response = errorResponse(error);
  return { status: response.status, body: await response.json() };
}

describe("errorResponse", () => {
  it("gives an error with no code a default one for its status", async () => {
    expect(await bodyOf(new MockApiError(404, "Scenario not found."))).toEqual({
      status: 404,
      body: { code: "NOT_FOUND", message: "Scenario not found." },
    });
    expect((await bodyOf(new MockApiError(400, "Bad"))).body).toMatchObject({
      code: "BAD_REQUEST",
    });
    expect((await bodyOf(new MockApiError(409, "Taken"))).body).toMatchObject({ code: "CONFLICT" });
    expect((await bodyOf(new MockApiError(418, "Teapot"))).body).toMatchObject({
      code: "HTTP_418",
    });
  });

  it("keeps the code, params, path and problems an error carries", async () => {
    const problem = { code: "X", message: "x", path: "a.b", params: { n: 1 } };
    const { status, body } = await bodyOf(
      new MockApiError(400, "Not valid", {
        code: "THING_INVALID",
        params: { id: "7" },
        path: "a",
        problems: [problem],
      }),
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      code: "THING_INVALID",
      message: "Not valid",
      params: { id: "7" },
      path: "a",
      problems: [problem],
    });
  });

  it("rethrows anything that is not a mock error", () => {
    expect(() => errorResponse(new Error("boom"))).toThrow("boom");
  });
});

describe("readJson", () => {
  it("reports a body that is not JSON with its own code", async () => {
    const request = new Request("http://x.test", { method: "POST", body: "{oops" });
    await expect(readJson(request)).rejects.toMatchObject({
      status: 400,
      details: { code: "INVALID_JSON" },
    });
  });
});
