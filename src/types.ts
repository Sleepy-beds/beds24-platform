// ============================================================
// beds24-booking-sdk — Type Definitions
// Beds24 + Stripe + Resend を統合した宿泊予約SDK
// ============================================================

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
