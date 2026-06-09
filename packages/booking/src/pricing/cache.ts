import type { PriceCalculation } from "../types";

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedPrice {
  price: number;
  cachedAt: number;
}

export class PriceCache {
  private cache = new Map<string, CachedPrice>();
  private ttlMs: number;

  constructor(ttlMs = DEFAULT_CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  set(date: string, price: number): void {
    this.cache.set(date, { price, cachedAt: Date.now() });
  }

  get(date: string): number | undefined {
    const entry = this.cache.get(date);
    if (!entry) return undefined;
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(date);
      return undefined;
    }
    return entry.price;
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Parse Beds24 calendar API response and cache all prices.
   * Handles both "dates" object and "calendar" array formats.
   */
  populateFromCalendarResponse(rooms: unknown[]): void {
    for (const room of rooms) {
      const r = room as Record<string, unknown>;

      // Format 1: "dates" record
      if (r.dates && typeof r.dates === "object") {
        for (const [dateKey, entry] of Object.entries(
          r.dates as Record<string, { price1?: number }>,
        )) {
          let dateStr = dateKey;
          if (dateKey.length === 8 && !dateKey.includes("-")) {
            dateStr = `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`;
          }
          if (entry.price1 != null) {
            this.set(dateStr, entry.price1);
          }
        }
      }

      // Format 2: "calendar" array
      const calendarEntries = (r.calendar ?? []) as {
        from?: string;
        to?: string;
        price1?: number;
      }[];
      for (const entry of calendarEntries) {
        if (!entry.from || !entry.to || entry.price1 == null) continue;
        const [fy, fm, fd] = entry.from.split("-").map(Number);
        const [ty, tm, td] = entry.to.split("-").map(Number);
        const from = new Date(fy, fm - 1, fd);
        const to = new Date(ty, tm - 1, td);
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          this.set(formatDateStr(d), entry.price1);
        }
      }
    }
  }

  /**
   * Calculate total price from cache for a given stay.
   * Returns null if any date is missing from cache.
   */
  calculateTotal(
    checkIn: string,
    checkOut: string,
    guests: number,
    extraGuestThreshold: number,
    extraGuestSurcharge: number,
  ): PriceCalculation | null {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    let total = 0;

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateStr(d);
      const price = this.get(dateStr);
      if (price === undefined) {
        return null;
      }
      total += price;
    }

    const extraGuests = Math.max(0, guests - extraGuestThreshold);
    total += extraGuests * extraGuestSurcharge * nights;

    return { total, nights };
  }
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
