import { describe, expect, it } from "vitest";
import { sanitize, validateCheckoutRequest } from "../payment/validation";
import type { CheckoutRequest, PropertyConfig } from "../types";

const property: Pick<PropertyConfig, "maxGuests" | "validCheckInTimes" | "maxStayNights"> = {
  maxGuests: 6,
  validCheckInTimes: ["15:00", "16:00", "17:00"],
  maxStayNights: 30,
};

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function makeRequest(overrides: Partial<CheckoutRequest> = {}): CheckoutRequest {
  return {
    checkIn: futureDate(7),
    checkOut: futureDate(9),
    guestName: "山田 太郎",
    guestNameKana: "ヤマダ タロウ",
    guestEmail: "test@example.com",
    guestPhone: "090-1234-5678",
    guests: 2,
    totalPrice: 30000,
    checkInTime: "15:00",
    notes: "",
    ...overrides,
  };
}

describe("sanitize", () => {
  it("strips HTML tags", () => {
    expect(sanitize("<script>alert(1)</script>hello")).toBe("alert(1)hello");
    expect(sanitize("<b>bold</b>")).toBe("bold");
  });

  it("trims whitespace", () => {
    expect(sanitize("  hi  ")).toBe("hi");
  });

  it("respects max length", () => {
    expect(sanitize("abcdefghij", 5)).toBe("abcde");
  });

  it("returns empty string for non-strings", () => {
    expect(sanitize(undefined)).toBe("");
    expect(sanitize(null)).toBe("");
    expect(sanitize(123)).toBe("");
    expect(sanitize({})).toBe("");
  });
});

describe("validateCheckoutRequest", () => {
  it("accepts a valid request and returns sanitized values", () => {
    const result = validateCheckoutRequest(makeRequest(), property);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitized).toMatchObject({
      guestName: "山田 太郎",
      guestEmail: "test@example.com",
      guests: 2,
      nights: 2,
      checkInTime: "15:00",
    });
  });

  it("rejects missing required fields", () => {
    const result = validateCheckoutRequest(
      makeRequest({ guestEmail: "" } as Partial<CheckoutRequest>),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("required");
    expect(result.errors[0].code).toBe("MISSING_REQUIRED_FIELDS");
  });

  it("attaches stable error codes (locale-independent)", () => {
    const result = validateCheckoutRequest(
      makeRequest({ guestEmail: "bad", guestPhone: "x" }),
      property,
    );
    expect(result.valid).toBe(false);
    const codes = result.errors.map((e) => e.code).sort();
    expect(codes).toContain("INVALID_EMAIL");
    expect(codes).toContain("INVALID_PHONE");
  });

  it("rejects invalid date format", () => {
    const result = validateCheckoutRequest(
      makeRequest({ checkIn: "2026/05/01" }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "date")).toBe(true);
  });

  it("rejects past check-in dates", () => {
    const result = validateCheckoutRequest(
      makeRequest({ checkIn: "2000-01-01", checkOut: "2000-01-02" }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "checkIn")).toBe(true);
  });

  it("rejects checkOut <= checkIn", () => {
    const date = futureDate(7);
    const result = validateCheckoutRequest(
      makeRequest({ checkIn: date, checkOut: date }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "date" || e.field === "nights")).toBe(true);
  });

  it("rejects stays exceeding maxStayNights", () => {
    const result = validateCheckoutRequest(
      makeRequest({ checkIn: futureDate(7), checkOut: futureDate(60) }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "nights")).toBe(true);
  });

  it("rejects malformed email", () => {
    const result = validateCheckoutRequest(
      makeRequest({ guestEmail: "not-an-email" }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "guestEmail")).toBe(true);
  });

  it("rejects malformed phone", () => {
    const result = validateCheckoutRequest(
      makeRequest({ guestPhone: "abc" }),
      property,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "guestPhone")).toBe(true);
  });

  it("clamps guests within [1, maxGuests]", () => {
    const over = validateCheckoutRequest(makeRequest({ guests: 999 }), property);
    expect(over.sanitized?.guests).toBe(property.maxGuests);
    // Negative is treated as truthy; it clamps to 1
    const under = validateCheckoutRequest(makeRequest({ guests: -3 }), property);
    expect(under.sanitized?.guests).toBe(1);
  });

  it("defaults guests to 2 when value is 0/falsy", () => {
    const result = validateCheckoutRequest(makeRequest({ guests: 0 }), property);
    expect(result.sanitized?.guests).toBe(2);
  });

  it("falls back to 15:00 when checkInTime is not in validCheckInTimes", () => {
    const result = validateCheckoutRequest(
      makeRequest({ checkInTime: "23:00" }),
      property,
    );
    expect(result.sanitized?.checkInTime).toBe("15:00");
  });

  it("strips HTML from notes and name", () => {
    const result = validateCheckoutRequest(
      makeRequest({
        guestName: "<script>x</script>太郎",
        notes: "<b>note</b>",
      }),
      property,
    );
    expect(result.sanitized?.guestName).toBe("x太郎");
    expect(result.sanitized?.notes).toBe("note");
  });
});
