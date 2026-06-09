import { describe, expect, it } from "vitest";
import { Beds24Error, isBeds24Error } from "../src/errors";

describe("Beds24Error", () => {
  it("carries code, status and body", () => {
    const err = new Beds24Error({
      code: "RATE_LIMIT",
      message: "slow down",
      status: 429,
      body: { error: "limit" },
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(Beds24Error);
    expect(err.name).toBe("Beds24Error");
    expect(err.code).toBe("RATE_LIMIT");
    expect(err.status).toBe(429);
    expect(err.body).toEqual({ error: "limit" });
  });

  it("preserves the cause when wrapping", () => {
    const cause = new TypeError("boom");
    const err = new Beds24Error({ code: "NETWORK_ERROR", message: "wrapped", cause });
    expect(err.cause).toBe(cause);
  });

  it("isBeds24Error narrows unknown values", () => {
    expect(isBeds24Error(new Beds24Error({ code: "API_ERROR", message: "x" }))).toBe(true);
    expect(isBeds24Error(new Error("plain"))).toBe(false);
    expect(isBeds24Error("nope")).toBe(false);
  });

  describe("codeFromStatus", () => {
    it.each([
      [401, "AUTH_ERROR"],
      [403, "AUTH_ERROR"],
      [404, "NOT_FOUND"],
      [429, "RATE_LIMIT"],
      [400, "VALIDATION_ERROR"],
      [422, "VALIDATION_ERROR"],
      [500, "API_ERROR"],
      [502, "API_ERROR"],
    ])("maps %i to %s", (status, code) => {
      expect(Beds24Error.codeFromStatus(status as number)).toBe(code);
    });
  });
});
