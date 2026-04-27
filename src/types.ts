// ============================================================
// beds24-booking-sdk — Type Definitions
// Beds24 + Stripe + Resend を統合した宿泊予約SDK
// ============================================================

import type { IdempotencyStore } from "./payment/idempotency";

// --- SDK Configuration ---

export interface Beds24Config {
  refreshToken: string;
  accessToken?: string;
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
   * Custom store for Stripe webhook idempotency. Defaults to a process-local
   * in-memory store, which is **not safe for multi-instance or serverless
   * production environments** — supply a shared, persistent implementation
   * (Redis, DynamoDB, Postgres, etc.) in production.
   */
  idempotencyStore?: IdempotencyStore;
  /**
   * Custom guest / owner confirmation email templates. Defaults to the
   * built-in Japanese templates (see `email/templates.ts`). Provide your own
   * to localize the confirmation emails sent by `handlePaymentWebhook`.
   */
  templates?: BookingEmailTemplates;
}

// --- Beds24 Types ---

export interface Beds24Property {
  propertyId: number;
  name: string;
  rooms: { roomId: number; name: string }[];
}

export interface Beds24CalendarEntry {
  from: string;
  to: string;
  numAvail?: number;
  minStay?: number;
  price1?: number;
}

export interface Beds24RoomCalendar {
  roomId: number;
  propertyId: number;
  name?: string;
  calendar: Beds24CalendarEntry[];
}

export interface Beds24Offer {
  roomId: number;
  propertyId: number;
  available: boolean;
  price: number;
  minStay: number;
}

export interface Beds24BookingRequest {
  roomId: number;
  arrival: string;
  departure: string;
  numAdult: number;
  numChild?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status?: "confirmed" | "request" | "new";
  price?: number;
  notes?: string;
  infoItems?: { code: string; text: string }[];
}

export interface Beds24BookingResponse {
  success: boolean;
  new?: number[];
  modified?: number[];
  errors?: string[];
  warnings?: string[];
}

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
  };
  error?: string;
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

/**
 * Pluggable email template generators. Pass a custom pair via
 * {@link BookingSDKConfig.templates} (or `WebhookHandlerConfig.templates`)
 * to localize confirmation emails for non-Japanese audiences.
 */
export interface BookingEmailTemplates {
  guest: (data: BookingEmailData, property: PropertyConfig) => EmailContent;
  owner: (data: BookingEmailData, property: PropertyConfig) => EmailContent;
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

/**
 * Stable error codes returned by {@link validateCheckoutRequest}. Use these
 * (rather than the English `message`) when localizing or branching on errors
 * in your UI.
 */
export type ValidationErrorCode =
  | "MISSING_REQUIRED_FIELDS"
  | "INVALID_DATE_FORMAT"
  | "INVALID_DATE"
  | "CHECKOUT_NOT_AFTER_CHECKIN"
  | "PAST_CHECK_IN_DATE"
  | "INVALID_NIGHTS"
  | "INVALID_EMAIL"
  | "INVALID_PHONE";

export interface ValidationError {
  field: string;
  /** Stable, locale-independent error code. */
  code: ValidationErrorCode;
  /** Default English message. Consumers should localize from {@link code}. */
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
