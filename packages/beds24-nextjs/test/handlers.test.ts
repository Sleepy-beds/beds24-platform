import { describe, expect, it, vi } from "vitest";
import {
  availabilityHandler,
  calendarHandler,
  checkoutHandler,
  createBeds24Handlers,
  webhookHandler,
  type Beds24NextSDK,
} from "../src/handlers";

function makeSdk(overrides: Partial<Beds24NextSDK> = {}): Beds24NextSDK {
  return {
    checkAvailability: vi.fn(async () => true),
    getCalendar: vi.fn(async () => [{ roomId: 1, propertyId: 1, calendar: [] }]),
    createCheckout: vi.fn(async () => ({ url: "https://checkout.stripe.com/x", sessionId: "cs_1" })),
    handlePaymentWebhook: vi.fn(async () => ({ received: true, bookingId: "BK-1" })),
    ...overrides,
  };
}

const ORIGIN = "https://example.com/api/beds24";

describe("availabilityHandler", () => {
  it("returns availability for valid params", async () => {
    const sdk = makeSdk();
    const res = await availabilityHandler(sdk)(
      new Request(`${ORIGIN}/availability?checkIn=2030-06-12&checkOut=2030-06-14&guests=2`),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: true });
    expect(sdk.checkAvailability).toHaveBeenCalledWith("2030-06-12", "2030-06-14", 2);
  });

  it("400s when dates are missing", async () => {
    const res = await availabilityHandler(makeSdk())(new Request(`${ORIGIN}/availability`));
    expect(res.status).toBe(400);
  });
});

describe("calendarHandler", () => {
  it("returns the calendar array", async () => {
    const res = await calendarHandler(makeSdk())(
      new Request(`${ORIGIN}/calendar?startDate=2030-06-01&endDate=2030-06-30`),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it("400s without a date range", async () => {
    const res = await calendarHandler(makeSdk())(new Request(`${ORIGIN}/calendar?startDate=2030-06-01`));
    expect(res.status).toBe(400);
  });
});

describe("checkoutHandler", () => {
  it("returns the checkout session url", async () => {
    const res = await checkoutHandler(makeSdk())(
      new Request(`${ORIGIN}/checkout`, {
        method: "POST",
        body: JSON.stringify({ checkIn: "2030-06-12", checkOut: "2030-06-14" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ sessionId: "cs_1" });
  });

  it("400s when checkout returns an error (no url)", async () => {
    const sdk = makeSdk({ createCheckout: vi.fn(async () => ({ error: "price mismatch" })) });
    const res = await checkoutHandler(sdk)(
      new Request(`${ORIGIN}/checkout`, { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "price mismatch" });
  });
});

describe("webhookHandler", () => {
  it("passes the raw body and signature to the SDK", async () => {
    const sdk = makeSdk();
    const res = await webhookHandler(sdk)(
      new Request(`${ORIGIN}/webhook`, {
        method: "POST",
        body: "raw-body",
        headers: { "stripe-signature": "sig_123" },
      }),
    );
    expect(res.status).toBe(200);
    expect(sdk.handlePaymentWebhook).toHaveBeenCalledWith("raw-body", "sig_123");
  });

  it("400s when the webhook reports an error", async () => {
    const sdk = makeSdk({
      handlePaymentWebhook: vi.fn(async () => ({ received: false, error: "Invalid signature" })),
    });
    const res = await webhookHandler(sdk)(
      new Request(`${ORIGIN}/webhook`, { method: "POST", body: "x" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("error mapping", () => {
  it("maps a Beds24Error code to the right status", async () => {
    const sdk = makeSdk({
      checkAvailability: vi.fn(async () => {
        throw Object.assign(new Error("slow down"), { code: "RATE_LIMIT" });
      }),
    });
    const res = await availabilityHandler(sdk)(
      new Request(`${ORIGIN}/availability?checkIn=2030-06-12&checkOut=2030-06-14`),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "RATE_LIMIT" });
  });

  it("maps an unknown error to 500", async () => {
    const sdk = makeSdk({
      getCalendar: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    const res = await calendarHandler(sdk)(
      new Request(`${ORIGIN}/calendar?startDate=2030-06-01&endDate=2030-06-30`),
    );
    expect(res.status).toBe(500);
  });
});

describe("createBeds24Handlers", () => {
  it("builds all four handlers", () => {
    const handlers = createBeds24Handlers(makeSdk());
    expect(Object.keys(handlers)).toEqual(["availability", "calendar", "checkout", "webhook"]);
  });
});
