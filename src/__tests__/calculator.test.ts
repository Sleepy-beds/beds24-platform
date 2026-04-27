import { describe, expect, it } from "vitest";
import { calculateTotalPrice } from "../pricing/calculator";
import type { Availability, PropertyConfig } from "../types";

const property: Pick<PropertyConfig, "basePrice" | "extraGuestThreshold" | "extraGuestSurcharge"> = {
  basePrice: 10000,
  extraGuestThreshold: 2,
  extraGuestSurcharge: 3000,
};

function makeAvailability(date: string, price: number): Availability {
  return { date, available: true, price, minStay: 1 };
}

describe("calculateTotalPrice", () => {
  it("sums per-day prices for the stay", () => {
    const data = [
      makeAvailability("2026-05-01", 10000),
      makeAvailability("2026-05-02", 12000),
    ];
    expect(calculateTotalPrice("2026-05-01", "2026-05-03", data, 2, property)).toBe(22000);
  });

  it("falls back to basePrice when a date is missing from availability data", () => {
    const data = [makeAvailability("2026-05-01", 8000)];
    // 2026-05-02 absent → falls back to basePrice 10000
    expect(calculateTotalPrice("2026-05-01", "2026-05-03", data, 2, property)).toBe(18000);
  });

  it("adds extra-guest surcharge per extra guest per night", () => {
    const data = [
      makeAvailability("2026-05-01", 10000),
      makeAvailability("2026-05-02", 10000),
    ];
    // 4 guests = 2 extra * 3000 * 2 nights = 12000 surcharge
    expect(calculateTotalPrice("2026-05-01", "2026-05-03", data, 4, property)).toBe(32000);
  });

  it("returns 0 for zero-night stays", () => {
    expect(calculateTotalPrice("2026-05-01", "2026-05-01", [], 2, property)).toBe(0);
  });

  it("does not surcharge guests at or below threshold", () => {
    const data = [makeAvailability("2026-05-01", 10000)];
    expect(calculateTotalPrice("2026-05-01", "2026-05-02", data, 2, property)).toBe(10000);
    expect(calculateTotalPrice("2026-05-01", "2026-05-02", data, 1, property)).toBe(10000);
  });
});
