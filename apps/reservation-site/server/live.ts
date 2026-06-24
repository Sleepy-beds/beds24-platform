import {
  BookingSDK,
  isCheckoutError,
  type BookingSDKConfig,
  type Beds24RoomCalendar,
  type BookingNotification,
} from "@sleepy-beds/booking";
import { Beds24LineNotifier } from "@sleepy-beds/line";
import { env, property } from "./config.js";
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

/** Build the optional LINE notifier hook (platform's differentiator). */
function buildLineHook(): BookingSDKConfig["onBookingCreated"] {
  if (!env.lineToken || !env.lineTo) return undefined;
  const notifier = new Beds24LineNotifier({ channelAccessToken: env.lineToken, to: env.lineTo });
  return async (b: BookingNotification) => {
    await notifier.notifyBookingCreated({
      id: b.beds24BookingId ?? b.bookingId,
      guestName: b.guestName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guests: b.guests,
      totalPrice: b.totalPrice,
      nights: b.nights,
      phone: b.guestPhone,
      email: b.guestEmail,
      propertyName: property.name,
    });
  };
}

/** Live service backed by the real Beds24 + Stripe + Resend BookingSDK. */
export class LiveBookingService implements BookingService {
  readonly mode = "live" as const;
  private sdk: BookingSDK;

  constructor() {
    this.sdk = new BookingSDK({
      beds24: {
        refreshToken: env.beds24RefreshToken,
        propertyId: env.beds24PropertyId,
        roomId: env.beds24RoomId!,
      },
      stripe: {
        secretKey: env.stripeSecretKey,
        webhookSecret: env.stripeWebhookSecret,
      },
      email: {
        // Resend is optional; a disabled key keeps construction safe and send() no-ops.
        resendApiKey: env.resendApiKey || "re_disabled",
        from: env.emailFrom || "booking@example.com",
        owner: env.emailOwner || "owner@example.com",
        replyTo: env.emailReplyTo || undefined,
      },
      property,
      baseUrl: env.publicBaseUrl,
      onBookingCreated: buildLineHook(),
    });
  }

  async getCalendar(start: string, end: string): Promise<DayInfo[]> {
    const rooms = await this.sdk.getCalendar(start, end); // also populates the price cache
    const room = pickRoom(rooms, env.beds24RoomId);
    const byDate = expandCalendar(room);
    return eachDate(start, end).map((date) => {
      const entry = byDate.get(date);
      return {
        date,
        price: entry?.price ?? property.basePrice,
        available: entry?.available ?? false,
        minStay: entry?.minStay ?? 1,
      };
    });
  }

  async quote(checkIn: string, checkOut: string, guests: number): Promise<Quote | ServiceError> {
    if (nightsBetween(checkIn, checkOut) <= 0) {
      return { error: "チェックアウトはチェックインより後の日付を選んでください", status: 400 };
    }
    const result = this.sdk.verifyPriceFromCache(checkIn, checkOut, guests);
    if (!result) {
      return { error: "料金情報の有効期限が切れました。ページを再読み込みしてください。", status: 409 };
    }
    return { nights: result.nights, total: result.total, currency: "JPY" };
  }

  async createCheckout(input: CheckoutInput): Promise<{ url: string } | ServiceError> {
    const result = await this.sdk.createCheckout({
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      guestName: input.guestName,
      guestNameKana: input.guestNameKana,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      checkInTime: input.checkInTime ?? property.checkInTime,
      notes: input.notes ?? "",
      totalPrice: input.totalPrice,
    });
    if (isCheckoutError(result)) return { error: result.error, status: result.status };
    return { url: result.url };
  }

  async getReservation(sessionId: string): Promise<ReservationView | null> {
    try {
      const s = await this.sdk.stripe.checkout.sessions.retrieve(sessionId);
      const m = (s.metadata ?? {}) as Record<string, string>;
      const status: ReservationView["status"] = s.payment_status === "paid" ? "paid" : "pending";
      return {
        sessionId,
        status,
        guestName: m.guestName ?? "",
        checkIn: m.checkIn ?? "",
        checkOut: m.checkOut ?? "",
        guests: Number(m.guests ?? 0),
        nights: Number(m.nights ?? 0),
        totalPrice: s.amount_total ?? 0,
        currency: "JPY",
      };
    } catch {
      return null;
    }
  }

  async handleWebhook(rawBody: string, signature: string): Promise<{ status: number; body: unknown }> {
    const result = await this.sdk.handlePaymentWebhook(rawBody, signature);
    return { status: result.error ? 400 : 200, body: result };
  }
}

// --- calendar expansion helpers ---

interface DayEntry {
  price: number;
  available: boolean;
  minStay: number;
}

function pickRoom(rooms: Beds24RoomCalendar[], roomId?: number): Beds24RoomCalendar | undefined {
  if (!rooms.length) return undefined;
  return rooms.find((r) => r.roomId === roomId) ?? rooms[0];
}

/** Expand Beds24 calendar ranges (from/to inclusive) into a per-date map. */
function expandCalendar(room: Beds24RoomCalendar | undefined): Map<string, DayEntry> {
  const map = new Map<string, DayEntry>();
  if (!room) return map;
  for (const entry of room.calendar ?? []) {
    if (!entry.from || !entry.to) continue;
    for (const date of eachDate(entry.from, entry.to)) {
      map.set(date, {
        price: entry.price1 ?? 0,
        available: (entry.numAvail ?? 0) > 0,
        minStay: entry.minStay ?? 1,
      });
    }
  }
  return map;
}
