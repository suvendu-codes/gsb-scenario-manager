import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withSafeListener } from "shared";

class FakeDomainError extends Error {
  constructor(readonly kind: string) {
    super(`boom ${kind}`);
  }
}

afterEach(() => vi.restoreAllMocks());

describe("withSafeListener", () => {
  it.each(["not_found", "conflict", "forbidden", "invalid"])("logs %s at warn and rethrows the same error", async (kind) => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const err = new FakeDomainError(kind);

    await expect(withSafeListener("GET /x", () => Promise.reject(err))).rejects.toBe(err);

    expect(warn).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it.each(["unavailable", "bad_gateway"])("keeps %s at error", async (kind) => {
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    await expect(withSafeListener("GET /x", () => Promise.reject(new FakeDomainError(kind)))).rejects.toBeDefined();
    expect(error).toHaveBeenCalledOnce();
  });

  it("keeps unexpected errors at error", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    await expect(withSafeListener("GET /x", () => Promise.reject(new TypeError("x")))).rejects.toThrow("x");
    expect(error).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });
});
