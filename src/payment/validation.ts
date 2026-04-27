import type { CheckoutRequest, PropertyConfig, ValidationResult } from "../types";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\-+()\s]{7,20}$/;

/** Strip HTML/script tags and trim to max length. */
export function sanitize(input: unknown, maxLength = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLength);
}

export function validateCheckoutRequest(
  req: CheckoutRequest,
  property: Pick<PropertyConfig, "maxGuests" | "validCheckInTimes" | "maxStayNights">,
): ValidationResult {
  const errors: ValidationResult["errors"] = [];

  if (!req.checkIn || !req.checkOut || !req.guestName || !req.guestEmail || !req.guestPhone) {
    errors.push({
      field: "required",
      code: "MISSING_REQUIRED_FIELDS",
      message: "Required fields are missing.",
    });
    return { valid: false, errors };
  }

  if (!DATE_REGEX.test(req.checkIn) || !DATE_REGEX.test(req.checkOut)) {
    errors.push({
      field: "date",
      code: "INVALID_DATE_FORMAT",
      message: "Dates must be in YYYY-MM-DD format.",
    });
  }

  if (
    Number.isNaN(new Date(req.checkIn).getTime()) ||
    Number.isNaN(new Date(req.checkOut).getTime())
  ) {
    errors.push({ field: "date", code: "INVALID_DATE", message: "Invalid date value." });
  }

  if (errors.length === 0 && req.checkIn >= req.checkOut) {
    errors.push({
      field: "date",
      code: "CHECKOUT_NOT_AFTER_CHECKIN",
      message: "checkOut must be later than checkIn.",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (req.checkIn < today) {
    errors.push({
      field: "checkIn",
      code: "PAST_CHECK_IN_DATE",
      message: "checkIn cannot be in the past.",
    });
  }

  const nights = Math.round(
    (new Date(req.checkOut).getTime() - new Date(req.checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (nights <= 0 || nights > property.maxStayNights) {
    errors.push({
      field: "nights",
      code: "INVALID_NIGHTS",
      message: `Stay length must be between 1 and ${property.maxStayNights} nights.`,
    });
  }

  if (!EMAIL_REGEX.test(String(req.guestEmail))) {
    errors.push({
      field: "guestEmail",
      code: "INVALID_EMAIL",
      message: "guestEmail is not a valid email address.",
    });
  }
  if (!PHONE_REGEX.test(String(req.guestPhone))) {
    errors.push({
      field: "guestPhone",
      code: "INVALID_PHONE",
      message: "guestPhone is not a valid phone number.",
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const numGuests = Math.max(1, Math.min(property.maxGuests, Math.floor(Number(req.guests) || 2)));

  return {
    valid: true,
    errors: [],
    sanitized: {
      guestName: sanitize(req.guestName, 100),
      guestNameKana: sanitize(req.guestNameKana, 100),
      guestEmail: sanitize(req.guestEmail, 254),
      guestPhone: sanitize(req.guestPhone, 20),
      checkInTime: property.validCheckInTimes.includes(req.checkInTime ?? "")
        ? req.checkInTime!
        : "15:00",
      notes: sanitize(req.notes, 500),
      guests: numGuests,
      nights,
    },
  };
}
