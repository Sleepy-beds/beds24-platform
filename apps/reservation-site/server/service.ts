// ============================================================
// BookingService — the single interface the HTTP layer talks to.
// Two implementations: `live` (real @sleepy-beds BookingSDK) and `mock`
// (in-memory, zero external dependencies). Chosen at startup by `isLive`.
// ============================================================

export interface DayInfo {
  /** YYYY-MM-DD */
  date: string;
  price: number;
  available: boolean;
  minStay: number;
}

export interface Quote {
  nights: number;
  total: number;
  currency: string;
}

export interface CheckoutInput {
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestNameKana: string;
  guestEmail: string;
  guestPhone: string;
  checkInTime?: string;
  notes?: string;
  /** Client-computed total; re-verified server-side before charging. */
  totalPrice: number;
}

export type ServiceError = { error: string; status: number };

export function isServiceError(v: unknown): v is ServiceError {
  return typeof v === "object" && v !== null && "error" in v && "status" in v;
}

export interface ReservationView {
  sessionId: string;
  status: "paid" | "pending" | "unpaid" | "request";
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalPrice: number;
  currency: string;
  bookingId?: string;
}

export interface BookingService {
  readonly mode: "live" | "mock";
  /** Per-date price + availability for the calendar UI (inclusive range). */
  getCalendar(start: string, end: string): Promise<DayInfo[]>;
  /** Authoritative total for a stay. */
  quote(checkIn: string, checkOut: string, guests: number): Promise<Quote | ServiceError>;
  /** Start payment; returns a redirect URL (Stripe Checkout or mock success). */
  createCheckout(input: CheckoutInput): Promise<{ url: string } | ServiceError>;
  /** Reservation summary for the success page, by checkout session id. */
  getReservation(sessionId: string): Promise<ReservationView | null>;
  /** Payment-provider webhook (no-op in mock). */
  handleWebhook(rawBody: string, signature: string): Promise<{ status: number; body: unknown }>;
}

// --- shared date helpers (used by both implementations) ---

export function eachDate(start: string, endInclusive: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00`);
  const end = new Date(`${endInclusive}T00:00:00`);
  while (d <= end) {
    out.push(fmt(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00`).getTime();
  const b = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
