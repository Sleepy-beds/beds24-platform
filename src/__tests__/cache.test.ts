import { describe, expect, it, vi } from "vitest";
import { PriceCache } from "../pricing/cache";

describe("PriceCache", () => {
  it("set/get roundtrips a price", () => {
    const cache = new PriceCache();
    cache.set("2026-05-01", 12345);
    expect(cache.get("2026-05-01")).toBe(12345);
  });

  it("returns undefined for missing keys", () => {
    const cache = new PriceCache();
    expect(cache.get("2026-05-02")).toBeUndefined();
  });

  it("evicts entries past their TTL", () => {
    vi.useFakeTimers();
    const cache = new PriceCache(1000);
    cache.set("2026-05-01", 100);
    vi.advanceTimersByTime(1500);
    expect(cache.get("2026-05-01")).toBeUndefined();
    vi.useRealTimers();
  });

  it("clear empties the cache", () => {
    const cache = new PriceCache();
    cache.set("2026-05-01", 100);
    cache.clear();
    expect(cache.get("2026-05-01")).toBeUndefined();
  });

  it("populateFromCalendarResponse parses 'dates' record format", () => {
    const cache = new PriceCache();
    cache.populateFromCalendarResponse([
      {
        dates: {
          "2026-05-01": { price1: 11000 },
          "20260502": { price1: 12000 }, // YYYYMMDD form
        },
      },
    ]);
    expect(cache.get("2026-05-01")).toBe(11000);
    expect(cache.get("2026-05-02")).toBe(12000);
  });

  it("populateFromCalendarResponse parses 'calendar' array format with date ranges", () => {
    const cache = new PriceCache();
    cache.populateFromCalendarResponse([
      {
        calendar: [{ from: "2026-05-01", to: "2026-05-03", price1: 9000 }],
      },
    ]);
    expect(cache.get("2026-05-01")).toBe(9000);
    expect(cache.get("2026-05-02")).toBe(9000);
    expect(cache.get("2026-05-03")).toBe(9000);
  });

  it("calculateTotal returns null when any date is missing", () => {
    const cache = new PriceCache();
    cache.set("2026-05-01", 10000);
    expect(cache.calculateTotal("2026-05-01", "2026-05-03", 2, 2, 3000)).toBeNull();
  });

  it("calculateTotal sums prices and applies extra-guest surcharge", () => {
    const cache = new PriceCache();
    cache.set("2026-05-01", 10000);
    cache.set("2026-05-02", 12000);
    const result = cache.calculateTotal("2026-05-01", "2026-05-03", 4, 2, 3000);
    // 22000 base + (4-2)*3000*2 = 22000 + 12000 = 34000
    expect(result).toEqual({ total: 34000, nights: 2 });
  });
});
