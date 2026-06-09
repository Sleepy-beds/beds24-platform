import type { CheckoutRequest, PropertyConfig, ValidationResult } from "../types";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\-+()\s]{7,20}$/;

/** Strip HTML/script tags and trim to max length */
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
    errors.push({ field: "required", message: "必須項目が不足しています" });
    return { valid: false, errors };
  }

  if (!DATE_REGEX.test(req.checkIn) || !DATE_REGEX.test(req.checkOut)) {
    errors.push({ field: "date", message: "日付の形式が不正です" });
  }

  if (
    Number.isNaN(new Date(req.checkIn).getTime()) ||
    Number.isNaN(new Date(req.checkOut).getTime())
  ) {
    errors.push({ field: "date", message: "無効な日付です" });
  }

  if (errors.length === 0 && req.checkIn >= req.checkOut) {
    errors.push({
      field: "date",
      message: "チェックアウトはチェックインより後の日付にしてください",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (req.checkIn < today) {
    errors.push({ field: "checkIn", message: "過去の日付は予約できません" });
  }

  const nights = Math.round(
    (new Date(req.checkOut).getTime() - new Date(req.checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (nights <= 0 || nights > property.maxStayNights) {
    errors.push({
      field: "nights",
      message: `1〜${property.maxStayNights}泊の範囲で指定してください`,
    });
  }

  if (!EMAIL_REGEX.test(String(req.guestEmail))) {
    errors.push({ field: "guestEmail", message: "メールアドレスの形式が不正です" });
  }
  if (!PHONE_REGEX.test(String(req.guestPhone))) {
    errors.push({ field: "guestPhone", message: "電話番号の形式が不正です" });
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
