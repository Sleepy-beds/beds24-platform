import type { Beds24Booking } from "beds24-sdk";
import type { BookingSummary, LineEvent, LineTextMessage } from "./types";

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** Format "YYYY-MM-DD" as "6/12(木)". Falls back to the raw string if unparseable. */
export function formatDateJa(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const date = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${WEEKDAYS_JA[date.getUTCDay()]})`;
}

/** Whole nights between two "YYYY-MM-DD" dates (0 if unparseable or negative). */
export function calcNights(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function formatPrice(amount: number, currency = "JPY"): string {
  if (currency === "JPY") return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

function nights(b: BookingSummary): number {
  return b.nights ?? calcNights(b.checkIn, b.checkOut);
}

/** Join non-empty lines into a single message body. */
function lines(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join("\n");
}

/** Render the notification text for a booking event. Returns LINE text messages. */
export function renderMessage(event: LineEvent, booking: BookingSummary): LineTextMessage[] {
  const stay = `📅 ${formatDateJa(booking.checkIn)} → ${formatDateJa(booking.checkOut)} (${nights(booking)}泊)`;
  const guest = `👤 ${booking.guestName} 様`;
  const people = booking.guests ? `👥 ${booking.guests}名` : "";
  const price = booking.totalPrice != null ? `💰 ${formatPrice(booking.totalPrice, booking.currency)}` : "";
  const phone = booking.phone ? `☎️ ${booking.phone}` : "";
  const where = booking.propertyName
    ? `🏠 ${booking.propertyName}${booking.roomName ? ` / ${booking.roomName}` : ""}`
    : "";

  let text: string;
  switch (event) {
    case "booking_created":
      text = lines("🎉 新規予約が入りました", "", where, stay, guest, people, price, phone);
      break;
    case "booking_cancelled":
      text = lines("⚠️ 予約がキャンセルされました", "", where, stay, guest, people);
      break;
    case "checkin_reminder":
      text = lines(
        "🔔 明日チェックインのお客様",
        "",
        where,
        `📅 ${formatDateJa(booking.checkIn)} チェックイン`,
        guest,
        people,
        phone,
      );
      break;
  }

  return [{ type: "text", text }];
}

/** Convert a Beds24 booking (from `getBookings`) into a {@link BookingSummary}. */
export function fromBeds24Booking(
  b: Beds24Booking,
  extra?: { propertyName?: string; roomName?: string; currency?: string },
): BookingSummary {
  const guestName = [b.firstName, b.lastName].filter(Boolean).join(" ").trim() || "ゲスト";
  return {
    id: b.id,
    guestName,
    checkIn: b.arrival,
    checkOut: b.departure,
    guests: (b.numAdult ?? 0) + (b.numChild ?? 0) || undefined,
    totalPrice: typeof b.price === "number" ? b.price : undefined,
    phone: b.phone,
    email: b.email,
    propertyName: extra?.propertyName,
    roomName: extra?.roomName,
    currency: extra?.currency,
  };
}
