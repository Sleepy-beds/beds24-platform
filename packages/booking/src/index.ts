import Stripe from "stripe";
import { Beds24Client } from "@sleepy-beds/beds24-sdk";
import { EmailSender } from "./email/sender";
import { generateBookingConfirmationEmail, generateOwnerNotificationEmail } from "./email/templates";
import { createCheckoutSession, isCheckoutError } from "./payment/checkout";
import { handleWebhook } from "./payment/webhook";
import { PriceCache } from "./pricing/cache";
import { calculateTotalPrice } from "./pricing/calculator";
import type {
  BookingSDKConfig,
  Beds24RoomCalendar,
  CheckoutRequest,
  CheckoutResult,
  WebhookResult,
  BookingEmailData,
  EmailContent,
  Availability,
  PriceCalculation,
} from "./types";
import type { CheckoutError } from "./payment/checkout";

export class BookingSDK {
  readonly beds24: Beds24Client;
  readonly email: EmailSender;
  readonly priceCache: PriceCache;
  readonly stripe: Stripe;
  readonly config: BookingSDKConfig;

  constructor(config: BookingSDKConfig) {
    this.config = config;
    this.beds24 = new Beds24Client(config.beds24);
    this.email = new EmailSender(config.email);
    this.priceCache = new PriceCache();
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: (config.stripe.apiVersion as Stripe.LatestApiVersion) ?? undefined,
    });
  }

  // --- Calendar & Availability ---

  async getCalendar(startDate: string, endDate: string): Promise<Beds24RoomCalendar[]> {
    const calendar = await this.beds24.getCalendar(
      startDate,
      endDate,
      this.config.beds24.propertyId,
    );
    const rooms = Array.isArray(calendar) ? calendar : [];
    this.priceCache.populateFromCalendarResponse(rooms);
    return calendar;
  }

  async checkAvailability(checkIn: string, checkOut: string, guests: number): Promise<boolean> {
    const offers = await this.beds24.getOffers(
      checkIn,
      checkOut,
      guests,
      this.config.beds24.propertyId,
    );
    return offers.some((offer) => offer.available !== false);
  }

  // --- Pricing ---

  calculatePrice(
    checkIn: string,
    checkOut: string,
    availabilityData: Availability[],
    guests = 2,
  ): number {
    return calculateTotalPrice(checkIn, checkOut, availabilityData, guests, this.config.property);
  }

  verifyPriceFromCache(
    checkIn: string,
    checkOut: string,
    guests: number,
  ): PriceCalculation | null {
    return this.priceCache.calculateTotal(
      checkIn,
      checkOut,
      guests,
      this.config.property.extraGuestThreshold,
      this.config.property.extraGuestSurcharge,
    );
  }

  // --- Checkout ---

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult | CheckoutError> {
    return createCheckoutSession({
      request,
      stripe: this.stripe,
      priceCache: this.priceCache,
      property: this.config.property,
      baseUrl: this.config.baseUrl,
    });
  }

  // --- Webhook ---

  async handlePaymentWebhook(rawBody: string, signature: string): Promise<WebhookResult> {
    return handleWebhook(rawBody, signature, {
      stripe: this.stripe,
      webhookSecret: this.config.stripe.webhookSecret,
      beds24: this.beds24,
      roomId: this.config.beds24.roomId,
      emailSender: this.email,
      property: this.config.property,
      onBookingCreated: this.config.onBookingCreated,
    });
  }

  // --- Email Templates ---

  generateGuestEmail(data: BookingEmailData): EmailContent {
    return generateBookingConfirmationEmail(data, this.config.property);
  }

  generateOwnerEmail(data: BookingEmailData): EmailContent {
    return generateOwnerNotificationEmail(data, this.config.property);
  }
}

// Re-export everything
export { Beds24Client } from "@sleepy-beds/beds24-sdk";
export { EmailSender } from "./email/sender";
export { generateBookingConfirmationEmail, generateOwnerNotificationEmail } from "./email/templates";
export { createCheckoutSession, isCheckoutError } from "./payment/checkout";
export { handleWebhook } from "./payment/webhook";
export { validateCheckoutRequest, sanitize } from "./payment/validation";
export { PriceCache } from "./pricing/cache";
export { calculateTotalPrice } from "./pricing/calculator";
export * from "./types";
