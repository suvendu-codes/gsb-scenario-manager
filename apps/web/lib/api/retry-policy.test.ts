import { afterEach, describe, expect, it } from "vitest";

import { ApiError, isServiceFailure } from "./errors";
import { getRetryPlan, retryRules } from "./retry-policy";

afterEach(() => {
  retryRules.length = 0;
});

describe("getRetryPlan: defaults", () => {
  it("retries GET twice, waiting 1 s then 2 s", () => {
    const plan = getRetryPlan("GET", "/things");

    expect(plan.retries).toBe(2);
    expect(plan.delayMs(1)).toBe(1000);
    expect(plan.delayMs(2)).toBe(2000);
  });

  it("retries HEAD as well", () => {
    expect(getRetryPlan("HEAD", "/things").retries).toBe(2);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("does not retry %s", (method) => {
    expect(getRetryPlan(method, "/things").retries).toBe(0);
  });

  it("retries network errors, timeouts and 5xx", () => {
    const { shouldRetry } = getRetryPlan("GET", "/things");

    expect(shouldRetry(new ApiError("network", 0, "x"))).toBe(true);
    expect(shouldRetry(new ApiError("timeout", 0, "x"))).toBe(true);
    expect(shouldRetry(new ApiError("http", 500, "x"))).toBe(true);
    expect(shouldRetry(new ApiError("http", 503, "x"))).toBe(true);
  });

  it("never retries 4xx or invalid responses", () => {
    const { shouldRetry } = getRetryPlan("GET", "/things");

    expect(shouldRetry(new ApiError("http", 400, "x"))).toBe(false);
    expect(shouldRetry(new ApiError("http", 404, "x"))).toBe(false);
    expect(shouldRetry(new ApiError("http", 429, "x"))).toBe(false);
    expect(shouldRetry(new ApiError("invalid-response", 200, "x"))).toBe(false);
  });
});

describe("getRetryPlan: rules and overrides", () => {
  it("uses the first rule that matches the method and path", () => {
    retryRules.push({ path: /^\/a$/, retries: 5 }, { path: /^\/a$/, retries: 9 });

    expect(getRetryPlan("GET", "/a").retries).toBe(5);
    expect(getRetryPlan("GET", "/b").retries).toBe(2);
  });

  it("only applies a rule to the methods it lists", () => {
    retryRules.push({ methods: ["POST"], retries: 1 });

    expect(getRetryPlan("POST", "/a").retries).toBe(1);
    expect(getRetryPlan("GET", "/a").retries).toBe(2);
  });

  it("retries only the statuses a rule lists", () => {
    retryRules.push({ path: /^\/a$/, statuses: [503], retries: 1 });
    const { shouldRetry } = getRetryPlan("GET", "/a");

    expect(shouldRetry(new ApiError("http", 503, "x"))).toBe(true);
    expect(shouldRetry(new ApiError("http", 500, "x"))).toBe(false);
    expect(shouldRetry(new ApiError("network", 0, "x"))).toBe(true);
  });

  it("lets a rule list a 4xx status to retry", () => {
    retryRules.push({ statuses: [429], retries: 1 });

    expect(getRetryPlan("GET", "/a").shouldRetry(new ApiError("http", 429, "x"))).toBe(true);
  });

  it("lets the call override the rule", () => {
    retryRules.push({ path: /^\/a$/, retries: 5, backoffMs: 100 });
    const plan = getRetryPlan("GET", "/a", { retries: 1, backoffMs: 50 });

    expect(plan.retries).toBe(1);
    expect(plan.delayMs(1)).toBe(50);
    expect(plan.delayMs(3)).toBe(200);
  });
});

describe("isServiceFailure", () => {
  it("is true for network errors, timeouts and 5xx", () => {
    expect(isServiceFailure(new ApiError("network", 0, "x"))).toBe(true);
    expect(isServiceFailure(new ApiError("timeout", 0, "x"))).toBe(true);
    expect(isServiceFailure(new ApiError("http", 502, "x"))).toBe(true);
  });

  it("is false for 4xx, invalid responses and other errors", () => {
    expect(isServiceFailure(new ApiError("http", 404, "x"))).toBe(false);
    expect(isServiceFailure(new ApiError("invalid-response", 200, "x"))).toBe(false);
    expect(isServiceFailure(new Error("plain"))).toBe(false);
    expect(isServiceFailure(undefined)).toBe(false);
  });
});
