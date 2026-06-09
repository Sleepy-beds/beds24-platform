import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateTotalPrice } from "../src/pricing/calculator";
import { PriceCache } from "../src/pricing/cache";
import type { Availability } from "../src/types";

const priceConfig = {
  basePrice: 8000,
  extraGuestThreshold: 2,
  extraGuestSurcharge: 3000,
};

const availability: Availability[] = [
  { date: "2030-06-12", available: true, price: 10000, minStay: 1 },
  { date: "2030-06-13", available: true, price: 12000, minStay: 1 },
];

describe("calculateTotalPrice", () => {
  it("sums the per-night availability prices", () => {
    const total = calculateTotalPrice("2030-06-12", "2030-06-14", availability, 2, priceConfig);
    expect(total).toBe(22000);
  });

  it("falls back to basePrice for days missing from availability", () => {
    const total = calculateTotalPrice("2030-06-12", "2030-06-14", [], 2, priceConfig);
    expect(total).toBe(16000); // 2 nights * 8000
  });

  it("adds the extra-guest surcharge per night", () => {
    // 4 guests → 2 over threshold → 2 * 3000 * 2 nights = 12000 extra
    const total = calculateTotalPrice("2030-06-12", "2030-06-14", availability, 4, priceConfig);
    expect(total).toBe(22000 + 12000);
  });

  it("does not surcharge at or below the threshold", () => {
    const total = calculateTotalPrice("2030-06-12", "2030-06-13", availability, 2, priceConfig);
    expect(total).toBe(10000);
  });
});

describe("PriceCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and returns a price", () => {
    const cache = new PriceCache();
    cache.set("2030-06-12", 9000);
    expect(cache.get("2030-06-12")).toBe(9000);
  });

  it("returns undefined for a missing date", () => {
    expect(new PriceCache().get("2030-01-01")).toBeUndefined();
  });

  it("expires entries past the TTL", () => {
    vi.useFakeTimers();
    const cache = new PriceCache(60_000);
    cache.set("2030-06-12", 9000);
    vi.advanceTimersByTime(61_000);
    expect(cache.get("2030-06-12")).toBeUndefined();
  });

  it("clear() empties the cache", () => {
    const cache = new PriceCache();
    cache.set("2030-06-12", 9000);
    cache.clear();
    expect(cache.get("2030-06-12")).toBeUndefined();
  });

  it("populates from the calendar-array format", () => {
    const cache = new PriceCache();
    cache.populateFromCalendarResponse([
      { calendar: [{ from: "2030-06-12", to: "2030-06-13", price1: 9000 }] },
    ]);
    expect(cache.get("2030-06-12")).toBe(9000);
    expect(cache.get("2030-06-13")).toBe(9000);
  });

  it("populates from the dates-record format (8-digit keys)", () => {
    const cache = new PriceCache();
    cache.populateFromCalendarResponse([{ dates: { "20300612": { price1: 11000 } } }]);
    expect(cache.get("2030-06-12")).toBe(11000);
  });

  it("calculateTotal returns total and nights when all days are cached", () => {
    const cache = new PriceCache();
    cache.populateFromCalendarResponse([
      { calendar: [{ from: "2030-06-12", to: "2030-06-14", price1: 10000 }] },
    ]);
    const result = cache.calculateTotal("2030-06-12", "2030-06-14", 2, 2, 3000);
    expect(result).toEqual({ total: 20000, nights: 2 });
  });

  it("calculateTotal adds the extra-guest surcharge", () => {
    const cache = new PriceCache();
    cache.populateFromCalendarResponse([
      { calendar: [{ from: "2030-06-12", to: "2030-06-14", price1: 10000 }] },
    ]);
    const result = cache.calculateTotal("2030-06-12", "2030-06-14", 4, 2, 3000);
    expect(result).toEqual({ total: 20000 + 2 * 3000 * 2, nights: 2 });
  });

  it("calculateTotal returns null when a day is missing", () => {
    const cache = new PriceCache();
    cache.set("2030-06-12", 10000); // 13th missing
    expect(cache.calculateTotal("2030-06-12", "2030-06-14", 2, 2, 3000)).toBeNull();
  });
});
