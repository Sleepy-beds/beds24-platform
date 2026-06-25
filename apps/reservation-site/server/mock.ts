import { randomUUID } from "node:crypto";
import { property } from "./config.js";
import {
  type BookingService,
  type CheckoutInput,
  type DayInfo,
  type Quote,
  type ReservationView,
  type ServiceError,
  eachDate,
  nightsBetween,
} from "./service.js";

/**
 * In-memory implementation used when Beds24/Stripe credentials are absent.
 * Generates a realistic-looking calendar and simulates an instant-paid
 * checkout so the entire UI flow works with no external setup.
 */
export class MockBookingService implements BookingService {
  readonly mode = "mock" as const;
  private reservations = new Map<string, ReservationView>();

  private priceFor(date: string): number {
    const day = new Date(`${date}T00:00:00`).getDay(); // 0=Sun … 6=Sat
    const isWeekend = day === 5 || day === 6; // Fri / Sat
    return isWeekend ? property.weekendPrice : property.basePrice;
  }

  private isAvailable(date: string): boolean {
    // Deterministically block ~1 day per fortnight so the UI shows sold-out dates.
    const dom = new Date(`${date}T00:00:00`).getDate();
    return dom % 13 !== 0;
  }

  async getCalendar(start: string, end: string): Promise<DayInfo[]> {
    return eachDate(start, end).map((date) => ({
      date,
      price: this.priceFor(date),
      available: this.isAvailable(date),
      minStay: 1,
    }));
  }

  private computeTotal(checkIn: string, checkOut: string, guests: number): Quote | ServiceError {
    const nights = nightsBetween(checkIn, checkOut);
    if (nights <= 0) return { error: "チェックアウトはチェックインより後の日付を選んでください", status: 400 };
    if (nights > property.maxStayNights) {
      return { error: `連泊は最大${property.maxStayNights}泊までです`, status: 400 };
    }
    if (guests < 1 || guests > property.maxGuests) {
      return { error: `ご利用人数は1〜${property.maxGuests}名でお願いします`, status: 400 };
    }

    let roomTotal = 0;
    for (const date of eachDate(checkIn, checkOut).slice(0, nights)) {
      if (!this.isAvailable(date)) {
        return { error: `${date} は満室です。別の日程をお選びください`, status: 409 };
      }
      roomTotal += this.priceFor(date);
    }

    const extraGuests = Math.max(0, guests - property.extraGuestThreshold);
    const total = roomTotal + extraGuests * property.extraGuestSurcharge * nights;
    return { nights, total, currency: "JPY" };
  }

  async quote(checkIn: string, checkOut: string, guests: number): Promise<Quote | ServiceError> {
    return this.computeTotal(checkIn, checkOut, guests);
  }

  async createCheckout(input: CheckoutInput): Promise<{ url: string } | ServiceError> {
    const quote = this.computeTotal(input.checkIn, input.checkOut, input.guests);
    if ("error" in quote) return quote;

    if (Math.floor(input.totalPrice) !== quote.total) {
      return { error: "料金が一致しません。ページを再読み込みしてください。", status: 409 };
    }
    if (!input.guestName || !input.guestEmail || !input.guestPhone) {
      return { error: "お名前・メール・電話番号は必須です", status: 400 };
    }

    const sessionId = `mock_${randomUUID()}`;
    this.reservations.set(sessionId, {
      sessionId,
      status: "paid", // mock checkout is treated as instantly paid
      guestName: input.guestName,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      nights: quote.nights,
      totalPrice: quote.total,
      currency: "JPY",
      bookingId: `BK-${sessionId.slice(5, 13)}`,
    });

    // No external redirect — go straight to the success page.
    return { url: `/reservation/success?session_id=${sessionId}` };
  }

  async getReservation(sessionId: string): Promise<ReservationView | null> {
    return this.reservations.get(sessionId) ?? null;
  }

  async handleWebhook(): Promise<{ status: number; body: unknown }> {
    return { status: 200, body: { received: true, mock: true } };
  }
}
