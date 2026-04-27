import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { handleWebhook } from "../payment/webhook";
import { InMemoryIdempotencyStore } from "../payment/idempotency";
import type { PropertyConfig } from "../types";
import type { Beds24Client } from "../beds24/client";
import type { EmailSender } from "../email/sender";

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

function makeStripeStub(event: Stripe.Event | "throw"): Stripe {
  return {
    webhooks: {
      constructEvent: vi.fn(() => {
        if (event === "throw") throw new Error("bad signature");
        return event;
      }),
    },
  } as unknown as Stripe;
}

function makeBeds24Stub(behavior: "ok" | "fail" = "ok"): Beds24Client {
  return {
    createBooking: vi.fn(async () => {
      if (behavior === "fail") throw new Error("Beds24 down");
      return { success: true, new: [9999] };
    }),
  } as unknown as Beds24Client;
}

function makeEmailStub(behavior: "ok" | "fail" = "ok"): EmailSender {
  return {
    sendBookingEmails: vi.fn(async () => {
      if (behavior === "fail") throw new Error("smtp error");
      return { guestSent: true, ownerSent: true };
    }),
  } as unknown as EmailSender;
}

function makeCheckoutEvent(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Event {
  const session = {
    id: "cs_test_abc12345",
    amount_total: 30000,
    metadata: {
      checkIn: "2026-05-01",
      checkOut: "2026-05-03",
      guestName: "山田 太郎",
      guestNameKana: "ヤマダ タロウ",
      guestEmail: "test@example.com",
      guestPhone: "090-1234-5678",
      guests: "2",
      nights: "2",
      checkInTime: "15:00",
      notes: "",
    },
    ...overrides,
  } as Stripe.Checkout.Session;
  return {
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: { object: session },
  } as unknown as Stripe.Event;
}

describe("handleWebhook", () => {
  it("rejects invalid signatures without side effects", async () => {
    const beds24 = makeBeds24Stub();
    const email = makeEmailStub();
    const result = await handleWebhook("body", "bad-sig", {
      stripe: makeStripeStub("throw"),
      webhookSecret: "whsec",
      beds24,
      roomId: 1,
      emailSender: email,
      property,
      idempotencyStore: new InMemoryIdempotencyStore(),
    });
    expect(result).toEqual({ received: false, error: "Invalid signature" });
    expect(beds24.createBooking).not.toHaveBeenCalled();
    expect(email.sendBookingEmails).not.toHaveBeenCalled();
  });

  it("ignores unrelated event types", async () => {
    const beds24 = makeBeds24Stub();
    const event = {
      id: "evt_other",
      type: "payment_intent.created",
      data: { object: {} },
    } as unknown as Stripe.Event;
    const result = await handleWebhook("body", "sig", {
      stripe: makeStripeStub(event),
      webhookSecret: "whsec",
      beds24,
      roomId: 1,
      emailSender: makeEmailStub(),
      property,
      idempotencyStore: new InMemoryIdempotencyStore(),
    });
    expect(result).toEqual({ received: true });
    expect(beds24.createBooking).not.toHaveBeenCalled();
  });

  it("creates a Beds24 booking and sends emails on a valid event", async () => {
    const beds24 = makeBeds24Stub();
    const email = makeEmailStub();
    const result = await handleWebhook("body", "sig", {
      stripe: makeStripeStub(makeCheckoutEvent()),
      webhookSecret: "whsec",
      beds24,
      roomId: 42,
      emailSender: email,
      property,
      idempotencyStore: new InMemoryIdempotencyStore(),
    });

    expect(result.received).toBe(true);
    expect(result.bookingId).toBe("BK-abc12345");
    expect(beds24.createBooking).toHaveBeenCalledTimes(1);
    expect(email.sendBookingEmails).toHaveBeenCalledTimes(1);
    expect(result.results?.beds24).toMatch(/^OK/);
    expect(result.results?.email).toMatch(/guest: OK/);
  });

  it("skips duplicate events via idempotency store", async () => {
    const store = new InMemoryIdempotencyStore();
    const beds24 = makeBeds24Stub();
    const email = makeEmailStub();
    const baseConfig = {
      stripe: makeStripeStub(makeCheckoutEvent()),
      webhookSecret: "whsec",
      beds24,
      roomId: 42,
      emailSender: email,
      property,
      idempotencyStore: store,
    };

    await handleWebhook("body", "sig", baseConfig);
    // Second delivery of the same event id
    const second = await handleWebhook("body", "sig", {
      ...baseConfig,
      stripe: makeStripeStub(makeCheckoutEvent()),
    });

    expect(second).toEqual({ received: true });
    expect(beds24.createBooking).toHaveBeenCalledTimes(1);
    expect(email.sendBookingEmails).toHaveBeenCalledTimes(1);
  });

  it("returns 4xx-style error when metadata is missing", async () => {
    const event = makeCheckoutEvent({ metadata: {} });
    const result = await handleWebhook("body", "sig", {
      stripe: makeStripeStub(event),
      webhookSecret: "whsec",
      beds24: makeBeds24Stub(),
      roomId: 1,
      emailSender: makeEmailStub(),
      property,
      idempotencyStore: new InMemoryIdempotencyStore(),
    });
    expect(result.received).toBe(false);
    expect(result.error).toMatch(/No metadata/);
  });

  it("does NOT mark event as processed if Beds24 booking fails (allows retry)", async () => {
    const store = new InMemoryIdempotencyStore();
    const beds24 = makeBeds24Stub("fail");
    const email = makeEmailStub();

    const result = await handleWebhook("body", "sig", {
      stripe: makeStripeStub(makeCheckoutEvent()),
      webhookSecret: "whsec",
      beds24,
      roomId: 1,
      emailSender: email,
      property,
      idempotencyStore: store,
    });

    expect(result.received).toBe(false);
    expect(result.error).toMatch(/Beds24/);
    expect(store.has("evt_test_1")).toBe(false);
    expect(email.sendBookingEmails).not.toHaveBeenCalled();
  });

  it("uses custom templates when provided (e.g. for non-Japanese locales)", async () => {
    const beds24 = makeBeds24Stub();
    const email = makeEmailStub();
    const guestTpl = vi.fn(() => ({
      subject: "EN: Booking confirmed",
      html: "<p>EN html</p>",
      text: "EN text",
    }));
    const ownerTpl = vi.fn(() => ({
      subject: "EN: New booking",
      html: "<p>EN owner</p>",
      text: "EN owner text",
    }));

    const result = await handleWebhook("body", "sig", {
      stripe: makeStripeStub(makeCheckoutEvent()),
      webhookSecret: "whsec",
      beds24,
      roomId: 1,
      emailSender: email,
      property,
      idempotencyStore: new InMemoryIdempotencyStore(),
      templates: { guest: guestTpl, owner: ownerTpl },
    });

    expect(result.received).toBe(true);
    expect(guestTpl).toHaveBeenCalledTimes(1);
    expect(ownerTpl).toHaveBeenCalledTimes(1);
    const sendArgs = (email.sendBookingEmails as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(sendArgs.guestSubject).toBe("EN: Booking confirmed");
    expect(sendArgs.ownerSubject).toBe("EN: New booking");
  });

  it("still succeeds (and marks processed) when email throws", async () => {
    const store = new InMemoryIdempotencyStore();
    const beds24 = makeBeds24Stub();
    const email = makeEmailStub("fail");

    const result = await handleWebhook("body", "sig", {
      stripe: makeStripeStub(makeCheckoutEvent()),
      webhookSecret: "whsec",
      beds24,
      roomId: 1,
      emailSender: email,
      property,
      idempotencyStore: store,
    });

    expect(result.received).toBe(true);
    expect(result.results?.beds24).toMatch(/^OK/);
    expect(result.results?.email).toMatch(/^FAILED/);
    expect(store.has("evt_test_1")).toBe(true);
  });
});
