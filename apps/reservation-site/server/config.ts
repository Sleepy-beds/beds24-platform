import "dotenv/config";
import type { PropertyConfig } from "@sleepy-beds/beds24-booking-sdk";

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : fallback;
}

/** Public, UI-safe slice of the property config (no secrets). */
export interface PublicProperty {
  name: string;
  nameEn?: string;
  address: string;
  phone: string;
  maxGuests: number;
  checkInTime: string;
  checkOutTime: string;
  basePrice: number;
  extraGuestThreshold: number;
  extraGuestSurcharge: number;
  maxStayNights: number;
  validCheckInTimes: string[];
  currency: string;
}

export const property: PropertyConfig = {
  name: process.env.PROPERTY_NAME ?? "サンプル宿",
  nameEn: process.env.PROPERTY_NAME_EN ?? "Sample Inn",
  address: process.env.PROPERTY_ADDRESS ?? "東京都〇〇区〇〇 1-2-3",
  phone: process.env.PROPERTY_PHONE ?? "03-0000-0000",
  maxGuests: num(process.env.PROPERTY_MAX_GUESTS, 6),
  checkInTime: process.env.PROPERTY_CHECKIN_TIME ?? "15:00",
  checkOutTime: process.env.PROPERTY_CHECKOUT_TIME ?? "10:00",
  basePrice: num(process.env.PROPERTY_BASE_PRICE, 15000),
  weekendPrice: num(process.env.PROPERTY_WEEKEND_PRICE, 18000),
  extraGuestThreshold: num(process.env.PROPERTY_EXTRA_GUEST_THRESHOLD, 2),
  extraGuestSurcharge: num(process.env.PROPERTY_EXTRA_GUEST_SURCHARGE, 3000),
  maxStayNights: num(process.env.PROPERTY_MAX_STAY_NIGHTS, 14),
  validCheckInTimes: list(process.env.PROPERTY_VALID_CHECKIN_TIMES, [
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ]),
};

export function publicProperty(): PublicProperty {
  return {
    name: property.name,
    nameEn: property.nameEn,
    address: property.address,
    phone: property.phone,
    maxGuests: property.maxGuests,
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    basePrice: property.basePrice,
    extraGuestThreshold: property.extraGuestThreshold,
    extraGuestSurcharge: property.extraGuestSurcharge,
    maxStayNights: property.maxStayNights,
    validCheckInTimes: property.validCheckInTimes,
    currency: "JPY",
  };
}

export const env = {
  port: num(process.env.PORT, 8787),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:5173",

  beds24RefreshToken: process.env.BEDS24_REFRESH_TOKEN || "",
  beds24PropertyId: process.env.BEDS24_PROPERTY_ID ? Number(process.env.BEDS24_PROPERTY_ID) : undefined,
  beds24RoomId: process.env.BEDS24_ROOM_ID ? Number(process.env.BEDS24_ROOM_ID) : undefined,

  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  emailOwner: process.env.EMAIL_OWNER || "",
  emailReplyTo: process.env.EMAIL_REPLY_TO || "",

  lineToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  lineTo: process.env.LINE_TO || "",
};

/**
 * Live mode needs both a Beds24 token (inventory + booking creation) and Stripe
 * keys (checkout + webhook). Missing either falls back to the in-memory mock so
 * the whole site runs locally with zero external setup.
 */
export const isLive = Boolean(
  env.beds24RefreshToken && env.beds24RoomId && env.stripeSecretKey && env.stripeWebhookSecret,
);
