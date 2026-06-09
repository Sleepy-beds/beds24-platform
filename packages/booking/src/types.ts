// ============================================================
// beds24-booking-sdk — Type Definitions
// Beds24 + Stripe + Resend を統合した宿泊予約SDK
// Beds24 のAPI型は beds24-sdk（純粋コア）から再エクスポートする
// ============================================================

import type { Beds24ClientConfig } from "@sleepy-beds/beds24-sdk";

// Re-export the core Beds24 API types so consumers of this package can keep
// importing them from one place.
export type {
  Beds24ClientConfig,
  Beds24Property,
  Beds24CalendarEntry,
  Beds24RoomCalendar,
  Beds24Offer,
  Beds24BookingRequest,
  Beds24BookingResponse,
  Beds24Booking,
} from "@sleepy-beds/beds24-sdk";
export { Beds24Error, isBeds24Error } from "@sleepy-beds/beds24-sdk";

// --- SDK Configuration ---

/** Beds24 credentials plus the property/room this booking flow operates on. */
export interface Beds24Config extends Beds24ClientConfig {
  propertyId?: number;
  roomId: number;
}

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion?: string;
}

export interface EmailConfig {
  resendApiKey: string;
  from: string;
  owner: string;
  replyTo?: string;
}

export interface PropertyConfig {
  /** 施設名（日本語表示用） */
  name: string;
  /** 施設名（英語・ローマ字。メールヘッダーのサブタイトル等に使用） */
  nameEn?: string;
  maxGuests: number;
  checkInTime: string;
  checkOutTime: string;
  address: string;
  phone: string;
  basePrice: number;
  weekendPrice: number;
  extraGuestThreshold: number;
  extraGuestSurcharge: number;
  validCheckInTimes: string[];
  maxStayNights: number;
}

export interface BookingSDKConfig {
  beds24: Beds24Config;
  stripe: StripeConfig;
  email: EmailConfig;
  property: PropertyConfig;
  baseUrl: string;
  /**
   * Optional hook fired after a booking is successfully created from a paid
   * checkout (inside the Stripe webhook). Use it to send a LINE notification,
   * push to Slack, etc. Errors are caught and reported in the webhook result —
   * they never fail the booking. Decoupled from any specific notifier so you
   * can wire in `@sleepy-beds/beds24-line` (or anything) yourself.
   */
  onBookingCreated?: (booking: BookingNotification) => Promise<void> | void;
}

// (Beds24 API entity types are re-exported from beds24-sdk above.)

// --- Booking / Checkout Types ---

export interface GuestInfo {
  guestName: string;
  guestNameKana: string;
  guestEmail: string;
  guestPhone: string;
  guests: number;
  checkInTime?: string;
  notes?: string;
}

export interface CheckoutRequest extends GuestInfo {
  checkIn: string;
  checkOut: string;
  totalPrice: number;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface WebhookResult {
  received: boolean;
  bookingId?: string;
  results?: {
    beds24?: string;
    email?: string;
    notification?: string;
  };
  error?: string;
}

/**
 * Payload passed to {@link BookingSDKConfig.onBookingCreated}. Its shape maps
 * directly onto `@sleepy-beds/beds24-line`'s `BookingSummary`.
 */
export interface BookingNotification {
  /** Local booking reference, e.g. `BK-1a2b3c4d`. */
  bookingId: string;
  /** The Beds24 booking id, when available. */
  beds24BookingId?: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  nights: number;
  guestEmail: string;
  guestPhone: string;
}

// --- Email Types ---

export interface BookingEmailData {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestNameKana: string;
  guestEmail: string;
  guestPhone: string;
  guests: number;
  notes: string;
  totalPrice: number;
  nights: number;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  guestSent: boolean;
  ownerSent: boolean;
}

// --- Pricing Types ---

export interface PriceCalculation {
  total: number;
  nights: number;
}

export interface Availability {
  date: string;
  available: boolean;
  price: number;
  minStay: number;
}

// --- Validation ---

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: {
    guestName: string;
    guestNameKana: string;
    guestEmail: string;
    guestPhone: string;
    checkInTime: string;
    notes: string;
    guests: number;
    nights: number;
  };
}
