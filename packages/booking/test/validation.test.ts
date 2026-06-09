import { describe, expect, it } from "vitest";
import { sanitize, validateCheckoutRequest } from "../src/payment/validation";
import type { CheckoutRequest } from "../src/types";

const property = {
  maxGuests: 6,
  validCheckInTimes: ["15:00", "16:00", "17:00"],
  maxStayNights: 10,
};

function req(overrides: Partial<CheckoutRequest> = {}): CheckoutRequest {
  return {
    checkIn: "2030-06-12",
    checkOut: "2030-06-14",
    guestName: "山田太郎",
    guestNameKana: "ヤマダタロウ",
    guestEmail: "taro@example.com",
    guestPhone: "090-1234-5678",
    guests: 2,
    checkInTime: "15:00",
    notes: "よろしくお願いします",
    totalPrice: 22000,
    ...overrides,
  };
}

describe("sanitize", () => {
  it("strips HTML tags and trims", () => {
    expect(sanitize("  <script>alert(1)</script>hello  ")).toBe("alert(1)hello");
  });
  it("returns empty string for non-strings", () => {
    expect(sanitize(undefined)).toBe("");
    expect(sanitize(42)).toBe("");
  });
  it("truncates to maxLength", () => {
    expect(sanitize("abcdef", 3)).toBe("abc");
  });
});

describe("validateCheckoutRequest", () => {
  it("accepts a valid request and returns sanitized data", () => {
    const result = validateCheckoutRequest(req(), property);
    expect(result.valid).toBe(true);
    expect(result.sanitized).toMatchObject({
      guests: 2,
      nights: 2,
      checkInTime: "15:00",
      guestEmail: "taro@example.com",
    });
  });

  it("flags missing required fields", () => {
    const result = validateCheckoutRequest(req({ guestEmail: "" }), property);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("required");
  });

  it("rejects a malformed date", () => {
    const result = validateCheckoutRequest(req({ checkIn: "2030/06/12" }), property);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "date")).toBe(true);
  });

  it("rejects checkout on/before checkin", () => {
    const result = validateCheckoutRequest(
      req({ checkIn: "2030-06-14", checkOut: "2030-06-12" }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "date")).toBe(true);
  });

  it("rejects past check-in dates", () => {
    const result = validateCheckoutRequest(
      req({ checkIn: "2020-01-01", checkOut: "2020-01-03" }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "checkIn")).toBe(true);
  });

  it("rejects stays longer than maxStayNights", () => {
    const result = validateCheckoutRequest(
      req({ checkIn: "2030-06-12", checkOut: "2030-06-30" }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "nights")).toBe(true);
  });

  it("rejects an invalid email and phone", () => {
    const result = validateCheckoutRequest(
      req({ guestEmail: "not-an-email", guestPhone: "abc" }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "guestEmail")).toBe(true);
    expect(result.errors.some((e) => e.field === "guestPhone")).toBe(true);
  });

  it("clamps guests to [1, maxGuests]", () => {
    expect(validateCheckoutRequest(req({ guests: 99 }), property).sanitized?.guests).toBe(6);
    expect(validateCheckoutRequest(req({ guests: 0 }), property).sanitized?.guests).toBe(2);
  });

  it("defaults an invalid check-in time to 15:00", () => {
    const result = validateCheckoutRequest(req({ checkInTime: "25:00" }), property);
    expect(result.sanitized?.checkInTime).toBe("15:00");
  });
});
