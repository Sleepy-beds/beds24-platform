import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { handleWebhook, type WebhookHandlerConfig } from "../src/payment/webhook";
import type { EmailSender } from "../src/email/sender";
import type { Beds24Client } from "@sleepy-beds/sdk";
import type { PropertyConfig } from "../src/types";

const property: PropertyConfig = {
  name: "古民家のらり",
  nameEn: "Kominka Norari",
  maxGuests: 6,
  checkInTime: "15:00",
  checkOutTime: "10:00",
  address: "Okinawa",
  phone: "098-000-0000",
  basePrice: 10000,
  weekendPrice: 12000,
  extraGuestThreshold: 2,
  extraGuestSurcharge: 3000,
  validCheckInTimes: ["15:00", "16:00"],
  maxStayNights: 10,
};

function makeConfig(
  eventId: string,
  overrides: Partial<WebhookHandlerConfig> = {},
): WebhookHandlerConfig {
  const session = {
    id: `cs_test_${eventId}`,
    amount_total: 22000,
    metadata: {
      checkIn: "2030-06-12",
      checkOut: "2030-06-14",
      guestName: "Yamada Taro",
      guestNameKana: "ヤマダタロウ",
      guestEmail: "taro@example.com",
      guestPhone: "090-1234-5678",
      guests: "2",
      nights: "2",
      notes: "",
    },
  };
  const event = {
    id: eventId,
    type: "checkout.session.completed",
    data: { object: session },
  };
  return {
    stripe: { webhooks: { constructEvent: vi.fn(() => event) } } as unknown as Stripe,
    webhookSecret: "whsec_test",
    beds24: {
      createBooking: vi.fn(async () => ({ success: true, new: [9001] })),
    } as unknown as Beds24Client,
    roomId: 123,
    emailSender: {
      sendBookingEmails: vi.fn(async () => ({ guestSent: true, ownerSent: true })),
    } as unknown as EmailSender,
    property,
    ...overrides,
  };
}

describe("handleWebhook — onBookingCreated hook", () => {
  it("fires the hook with mapped booking data after a successful booking", async () => {
    const onBookingCreated = vi.fn(async () => {});
    const result = await handleWebhook("raw", "sig", makeConfig("evt_hook_1", { onBookingCreated }));

    expect(result.received).toBe(true);
    expect(result.results?.notification).toBe("OK");
    expect(onBookingCreated).toHaveBeenCalledTimes(1);
    expect(onBookingCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        guestName: "Yamada Taro",
        checkIn: "2030-06-12",
        checkOut: "2030-06-14",
        guests: 2,
        totalPrice: 22000,
        nights: 2,
        beds24BookingId: 9001,
        guestPhone: "090-1234-5678",
      }),
    );
  });

  it("captures hook errors without failing the webhook", async () => {
    const onBookingCreated = vi.fn(async () => {
      throw new Error("LINE down");
    });
    const result = await handleWebhook("raw", "sig", makeConfig("evt_hook_2", { onBookingCreated }));

    expect(result.received).toBe(true);
    expect(result.results?.beds24).toContain("OK");
    expect(result.results?.notification).toContain("FAILED: LINE down");
  });

  it("works without a hook configured", async () => {
    const result = await handleWebhook("raw", "sig", makeConfig("evt_hook_3"));
    expect(result.received).toBe(true);
    expect(result.results?.notification).toBeUndefined();
  });

  it("does not create a booking twice for a repeated event id", async () => {
    const config = makeConfig("evt_hook_dup");
    await handleWebhook("raw", "sig", config);
    await handleWebhook("raw", "sig", config);
    expect(config.beds24.createBooking).toHaveBeenCalledTimes(1);
  });

  it("ignores non-checkout events", async () => {
    const config = makeConfig("evt_other");
    (config.stripe.webhooks.constructEvent as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "evt_other",
      type: "payment_intent.created",
      data: { object: {} },
    });
    const result = await handleWebhook("raw", "sig", config);
    expect(result).toEqual({ received: true });
    expect(config.beds24.createBooking).not.toHaveBeenCalled();
  });
});
