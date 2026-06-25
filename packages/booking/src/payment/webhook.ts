import type Stripe from "stripe";
import type { Beds24Client } from "@sleepy-beds/sdk";
import type { EmailSender } from "../email/sender";
import { generateBookingConfirmationEmail, generateOwnerNotificationEmail } from "../email/templates";
import type { BookingNotification, PropertyConfig, WebhookResult } from "../types";

export interface WebhookHandlerConfig {
  stripe: Stripe;
  webhookSecret: string;
  beds24: Beds24Client;
  roomId: number;
  emailSender: EmailSender;
  property: PropertyConfig;
  onBookingCreated?: (booking: BookingNotification) => Promise<void> | void;
}

// Simple in-memory idempotency guard
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 1000;

function markEventProcessed(eventId: string) {
  if (processedEvents.size >= MAX_PROCESSED_EVENTS) {
    const iterator = processedEvents.values();
    for (let i = 0; i < 100; i++) {
      const val = iterator.next().value;
      if (val) processedEvents.delete(val);
    }
  }
  processedEvents.add(eventId);
}

export async function handleWebhook(
  rawBody: string,
  signature: string,
  config: WebhookHandlerConfig,
): Promise<WebhookResult> {
  let event: Stripe.Event;
  try {
    event = config.stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
  } catch {
    return { received: false, error: "Invalid signature" };
  }

  if (event.type !== "checkout.session.completed") {
    return { received: true };
  }

  if (processedEvents.has(event.id)) {
    return { received: true };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata;

  if (!metadata || !metadata.checkIn) {
    return { received: false, error: "No metadata found on session" };
  }

  const bookingId = `BK-${session.id.slice(-8)}`;
  const results: WebhookResult["results"] = {};
  let beds24BookingId: number | undefined;

  // --- 1. Create Beds24 booking ---
  try {
    const nameParts = (metadata.guestName || "").trim().split(/\s+/);
    const lastName = nameParts[0] || "";
    const firstName = nameParts.slice(1).join(" ") || "";

    const result = await config.beds24.createBooking({
      roomId: config.roomId,
      arrival: metadata.checkIn,
      departure: metadata.checkOut,
      numAdult: Number(metadata.guests) || 1,
      firstName,
      lastName,
      email: metadata.guestEmail,
      phone: metadata.guestPhone,
      status: "confirmed",
      price: session.amount_total ?? 0,
      notes:
        [
          metadata.checkInTime ? `チェックイン予定: ${metadata.checkInTime}` : "",
          metadata.guestNameKana ? `カナ: ${metadata.guestNameKana}` : "",
          metadata.notes || "",
        ]
          .filter(Boolean)
          .join("\n") || undefined,
    });

    beds24BookingId = result.new?.[0];
    results.beds24 = `OK (id: ${beds24BookingId ?? "unknown"})`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { received: false, bookingId, error: `Beds24 booking failed: ${message}` };
  }

  // --- 2. Send confirmation emails ---
  try {
    const emailData = {
      bookingId,
      checkIn: metadata.checkIn,
      checkOut: metadata.checkOut,
      guestName: metadata.guestName,
      guestNameKana: metadata.guestNameKana || "",
      guestEmail: metadata.guestEmail,
      guestPhone: metadata.guestPhone,
      guests: Number(metadata.guests) || 1,
      notes: metadata.notes || "",
      totalPrice: session.amount_total ?? 0,
      nights: Number(metadata.nights) || 1,
    };

    const guestEmail = generateBookingConfirmationEmail(emailData, config.property);
    const ownerEmail = generateOwnerNotificationEmail(emailData, config.property);

    const emailResults = await config.emailSender.sendBookingEmails({
      guestEmail: metadata.guestEmail,
      guestSubject: guestEmail.subject,
      guestHtml: guestEmail.html,
      guestText: guestEmail.text,
      ownerSubject: ownerEmail.subject,
      ownerHtml: ownerEmail.html,
      ownerText: ownerEmail.text,
    });

    results.email = `guest: ${emailResults.guestSent ? "OK" : "FAILED"}, owner: ${emailResults.ownerSent ? "OK" : "FAILED"}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.email = `FAILED: ${message}`;
  }

  // --- 3. Fire optional notification hook (best-effort; never fails the booking) ---
  if (config.onBookingCreated) {
    try {
      await config.onBookingCreated({
        bookingId,
        beds24BookingId,
        guestName: metadata.guestName,
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        guests: Number(metadata.guests) || 1,
        totalPrice: session.amount_total ?? 0,
        nights: Number(metadata.nights) || 1,
        guestEmail: metadata.guestEmail,
        guestPhone: metadata.guestPhone,
      });
      results.notification = "OK";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.notification = `FAILED: ${message}`;
    }
  }

  markEventProcessed(event.id);

  return { received: true, bookingId, results };
}
