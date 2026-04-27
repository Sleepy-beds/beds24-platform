import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { createCheckoutSession, isCheckoutError } from "../payment/checkout";
import { PriceCache } from "../pricing/cache";
import type { CheckoutRequest, PropertyConfig } from "../types";

const property: PropertyConfig = {
  name: "Test Property",
  nameEn: "Test Property",
  maxGuests: 6,
  checkInTime: "15:00",
  checkOutTime: "10:00",
  address: "Tokyo",
  phone: "03-0000-0000",
  basePrice: 10000,
  weekendPrice: 12000,
  extraGuestThreshold: 2,
  extraGuestSurcharge: 3000,
  validCheckInTimes: ["15:00", "16:00"],
  maxStayNights: 30,
};

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function makeStripeStub(create: ReturnType<typeof vi.fn>): Stripe {
  return {
    checkout: { sessions: { create } },
  } as unknown as Stripe;
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
    totalPrice: 20000,
    checkInTime: "15:00",
    notes: "",
    ...overrides,
  };
}

describe("createCheckoutSession", () => {
  it("returns a CheckoutResult on successful price match", async () => {
    const cache = new PriceCache();
    const checkIn = futureDate(7);
    const checkOut = futureDate(9);
    cache.set(checkIn, 10000);
    const next = new Date(checkIn);
    next.setDate(next.getDate() + 1);
    cache.set(next.toISOString().slice(0, 10), 10000);

    const create = vi.fn(async () => ({
      id: "cs_test_1",
      url: "https://stripe.example/checkout",
    }));

    const result = await createCheckoutSession({
      request: makeRequest({ checkIn, checkOut, totalPrice: 20000 }),
      stripe: makeStripeStub(create),
      priceCache: cache,
      property,
      baseUrl: "https://example.com",
    });

    expect(isCheckoutError(result)).toBe(false);
    if (!isCheckoutError(result)) {
      expect(result.url).toBe("https://stripe.example/checkout");
      expect(result.sessionId).toBe("cs_test_1");
    }
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when validation fails", async () => {
    const cache = new PriceCache();
    const create = vi.fn();
    const result = await createCheckoutSession({
      request: makeRequest({ guestEmail: "bad" }),
      stripe: makeStripeStub(create),
      priceCache: cache,
      property,
      baseUrl: "https://example.com",
    });
    expect(isCheckoutError(result)).toBe(true);
    if (isCheckoutError(result)) {
      expect(result.status).toBe(400);
      expect(result.code).toBe("VALIDATION_FAILED");
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 409 when cache is empty (price expired)", async () => {
    const cache = new PriceCache();
    const create = vi.fn();
    const result = await createCheckoutSession({
      request: makeRequest(),
      stripe: makeStripeStub(create),
      priceCache: cache,
      property,
      baseUrl: "https://example.com",
    });
    expect(isCheckoutError(result)).toBe(true);
    if (isCheckoutError(result)) {
      expect(result.status).toBe(409);
      expect(result.code).toBe("PRICE_CACHE_EXPIRED");
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects price tampering with 409", async () => {
    const cache = new PriceCache();
    const checkIn = futureDate(7);
    const checkOut = futureDate(9);
    cache.set(checkIn, 10000);
    const next = new Date(checkIn);
    next.setDate(next.getDate() + 1);
    cache.set(next.toISOString().slice(0, 10), 10000);

    const create = vi.fn();
    const result = await createCheckoutSession({
      // server total = 20000, client claims 1
      request: makeRequest({ checkIn, checkOut, totalPrice: 1 }),
      stripe: makeStripeStub(create),
      priceCache: cache,
      property,
      baseUrl: "https://example.com",
    });
    expect(isCheckoutError(result)).toBe(true);
    if (isCheckoutError(result)) {
      expect(result.status).toBe(409);
      expect(result.code).toBe("PRICE_MISMATCH");
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects non-positive client totals with 400", async () => {
    const cache = new PriceCache();
    const create = vi.fn();
    const result = await createCheckoutSession({
      request: makeRequest({ totalPrice: 0 }),
      stripe: makeStripeStub(create),
      priceCache: cache,
      property,
      baseUrl: "https://example.com",
    });
    expect(isCheckoutError(result)).toBe(true);
    if (isCheckoutError(result)) {
      expect(result.status).toBe(400);
      expect(result.code).toBe("INVALID_PRICE");
    }
  });
});
