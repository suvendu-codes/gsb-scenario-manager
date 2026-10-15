import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { request } from "./client";
import { ApiError } from "./errors";
import { setForbiddenHandler, setTokenProvider, setUnauthorizedHandler } from "./interceptors";
import { retryRules } from "./retry-policy";

const schema = z.object({ id: z.string() });
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Runs `request` and returns the error it throws, failing the test if it does not throw. */
async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("Expected the request to fail");
}

/** Retries with no waiting, so tests stay fast. */
const noWait = { backoffMs: 0 };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  retryRules.length = 0;
  setTokenProvider(() => null);
  setUnauthorizedHandler((error) => console.error("Unauthorized (401):", error));
  setForbiddenHandler((error) => console.error("Forbidden (403):", error));
});

describe("request: success", () => {
  it("returns the parsed body and calls the API base URL with GET by default", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }));

    await expect(request("/things", schema)).resolves.toEqual({ id: "1" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/things");
    expect(init.method).toBe("GET");
  });

  it("sends the method and body it is given", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "2" }, 201));

    await request("/things", schema, { method: "POST", body: JSON.stringify({ a: 1 }) });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
  });
});

describe("request: failures", () => {
  it("turns a non-2xx response into an http ApiError with the server's message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Not here" }, 404));

    const error = await errorOf(request("/things", schema));

    expect(error).toMatchObject({ kind: "http", status: 404, message: "Not here" });
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 409, statusText: "Conflict" }));

    const error = await errorOf(request("/things", schema));

    expect(error).toMatchObject({ kind: "http", status: 409, message: "Conflict" });
  });

  it("wraps a body that is not valid JSON in an ApiError instead of a SyntaxError", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>not json</html>", { status: 200 }));

    const error = await errorOf(request("/things", schema));

    expect(error).toMatchObject({ kind: "invalid-response", status: 200 });
  });

  it("rejects a body that does not match the schema", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ wrong: true }));

    const error = await errorOf(request("/things", schema));

    expect(error).toMatchObject({ kind: "invalid-response" });
  });

  it("reports a network error with status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const error = await errorOf(request("/things", schema, { retry: { retries: 0 } }));

    expect(error).toMatchObject({ kind: "network", status: 0 });
  });

  it("reports a timeout when the server does not answer in time", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const error = await errorOf(
      request("/things", schema, { timeoutMs: 20, retry: { retries: 0 } }),
    );

    expect(error).toMatchObject({ kind: "timeout", status: 0 });
  });

  it("rethrows the abort error untouched when the caller cancels", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));

    await expect(
      request("/things", schema, { signal: controller.signal, retry: { retries: 0 } }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("request: retries", () => {
  it("retries a GET after a 5xx and returns the later success", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "down" }, 503))
      .mockResolvedValueOnce(jsonResponse({ id: "ok" }));

    await expect(request("/things", schema, { retry: noWait })).resolves.toEqual({ id: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a GET after a network error", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse({ id: "ok" }));

    await expect(request("/things", schema, { retry: noWait })).resolves.toEqual({ id: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after 2 retries (3 attempts) and throws the last error", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ message: "down" }, 500));

    const error = await errorOf(request("/things", schema, { retry: noWait }));

    expect(error.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 403, 404, 409, 422])("never retries a %i", async (status) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "no" }, status));

    await errorOf(request("/things", schema, { retry: noWait }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never retries a POST, even after a 5xx or a network error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "down" }, 503));
    await errorOf(request("/things", schema, { method: "POST" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await errorOf(request("/things", schema, { method: "POST" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry when the call sets retries to 0", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "down" }, 503));

    await errorOf(request("/things", schema, { retry: { retries: 0 } }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a listed 4xx status when the call asks for it", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "slow down" }, 429))
      .mockResolvedValueOnce(jsonResponse({ id: "ok" }));

    await expect(
      request("/things", schema, { retry: { statuses: [429], backoffMs: 0 } }),
    ).resolves.toEqual({ id: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("follows a matching rule from the rules table, including for a POST", async () => {
    retryRules.push({ methods: ["POST"], path: /^\/runs/, retries: 1, backoffMs: 0 });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "down" }, 503))
      .mockResolvedValueOnce(jsonResponse({ id: "run-1" }, 201));

    await expect(request("/runs", schema, { method: "POST" })).resolves.toEqual({ id: "run-1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lets a rule turn retrying off for one path", async () => {
    retryRules.push({ path: /^\/things$/, retries: 0 });
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "down" }, 503));

    await errorOf(request("/things", schema));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("request: interceptors", () => {
  it("adds the Authorization header when a token is available", async () => {
    setTokenProvider(() => "secret-token");
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }));

    await request("/things", schema);

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer secret-token");
  });

  it("sends no Authorization header when there is no token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }));

    await request("/things", schema);

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
  });

  it("keeps headers the caller passed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }));

    await request("/things", schema, { headers: { "Content-Type": "application/json" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("calls the unauthorized handler on a 401 and still throws", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Sign in" }, 401));

    const error = await errorOf(request("/things", schema));

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith(error);
    expect(error.status).toBe(401);
  });

  it("calls the forbidden handler on a 403 and not the unauthorized one", async () => {
    const onUnauthorized = vi.fn();
    const onForbidden = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setForbiddenHandler(onForbidden);
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "No access" }, 403));

    await errorOf(request("/things", schema));

    expect(onForbidden).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not call either handler for other errors", async () => {
    const onUnauthorized = vi.fn();
    const onForbidden = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setForbiddenHandler(onForbidden);
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "missing" }, 404));

    await errorOf(request("/things", schema));

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it("logs a 401 to the console by default", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Sign in" }, 401));

    await errorOf(request("/things", schema));

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
