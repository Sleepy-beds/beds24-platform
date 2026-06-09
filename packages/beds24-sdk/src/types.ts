// ============================================================
// beds24-sdk — Type Definitions
// Pure Beds24 API v2 types. No Stripe / Resend / email coupling.
// ============================================================

/**
 * Credentials and connection options for {@link Beds24Client}.
 *
 * Provide at least one of `refreshToken` (recommended) or `accessToken`.
 * When only a `refreshToken` is given, the client fetches and caches a
 * short-lived access token automatically.
 */
export interface Beds24ClientConfig {
  /** Long-lived refresh token issued by Beds24 (Settings → API). */
  refreshToken?: string;
  /** Short-lived access token. Auto-refreshed from `refreshToken` when omitted. */
  accessToken?: string;
  /**
   * Override the API base URL.
   * @default "https://beds24.com/api/v2"
   */
  baseUrl?: string;
  /**
   * Custom `fetch` implementation (e.g. for testing or non-global-fetch runtimes).
   * @default globalThis.fetch
   */
  fetch?: typeof fetch;
}

// --- Properties & Rooms ---

export interface Beds24Property {
  propertyId: number;
  name: string;
  rooms: { roomId: number; name: string }[];
}

// --- Calendar ---

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

export interface GetCalendarParams {
  startDate: string;
  endDate: string;
  propertyId?: number;
  roomId?: number;
}

// --- Offers / Availability ---

export interface Beds24Offer {
  roomId: number;
  propertyId: number;
  available: boolean;
  price: number;
  minStay: number;
}

export interface GetOffersParams {
  arrival: string;
  departure: string;
  numAdults: number;
  numChildren?: number;
  propertyId?: number;
}

// --- Bookings ---

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
  status?: "confirmed" | "request" | "new" | "cancelled" | "black";
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

/** A booking as returned by `GET /bookings`. Common fields are typed; the rest is open. */
export interface Beds24Booking {
  id: number;
  propertyId: number;
  roomId: number;
  status: string;
  arrival: string;
  departure: string;
  numAdult?: number;
  numChild?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  price?: number;
  bookingTime?: string;
  modifiedTime?: string;
  [key: string]: unknown;
}

/** Filters for {@link Beds24Client.getBookings}. Arbitrary Beds24 query params are also accepted. */
export interface GetBookingsParams {
  propertyId?: number | number[];
  roomId?: number | number[];
  /** Bookings arriving on/after this date (YYYY-MM-DD). */
  arrivalFrom?: string;
  /** Bookings arriving on/before this date (YYYY-MM-DD). */
  arrivalTo?: string;
  /** Bookings departing on/after this date (YYYY-MM-DD). */
  departureFrom?: string;
  /** Bookings departing on/before this date (YYYY-MM-DD). */
  departureTo?: string;
  status?: string | string[];
  /** Filter by last-modified timestamp (ISO 8601). Useful for incremental sync. */
  modifiedFrom?: string;
  page?: number;
  [key: string]: string | number | boolean | Array<string | number> | undefined;
}

/** Paginated envelope returned by `GET /bookings`. */
export interface Beds24BookingsResponse {
  success: boolean;
  type?: string;
  count?: number;
  pages?: number;
  data: Beds24Booking[];
}
