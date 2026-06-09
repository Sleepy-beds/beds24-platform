import { Beds24Error } from "./errors";
import type {
  Beds24Booking,
  Beds24BookingRequest,
  Beds24BookingResponse,
  Beds24BookingsResponse,
  Beds24ClientConfig,
  Beds24Offer,
  Beds24Property,
  Beds24RoomCalendar,
  GetBookingsParams,
  GetCalendarParams,
  GetOffersParams,
} from "./types";

const DEFAULT_API_BASE = "https://beds24.com/api/v2";

/**
 * A thin, typed wrapper over the Beds24 API v2.
 *
 * Handles access-token acquisition and caching, automatic refresh on `401`,
 * and maps every failure to a {@link Beds24Error} with a stable `code`.
 *
 * @example
 * ```ts
 * const client = new Beds24Client({ refreshToken: process.env.BEDS24_REFRESH_TOKEN });
 * const props = await client.getProperties();
 * ```
 */
export class Beds24Client {
  private readonly config: Beds24ClientConfig;
  private readonly apiBase: string;
  private readonly fetchImpl: typeof fetch;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;
  private staticTokenUsed = false;

  constructor(config: Beds24ClientConfig = {}) {
    if (!config.refreshToken && !config.accessToken) {
      throw new Beds24Error({
        code: "AUTH_ERROR",
        message:
          "Beds24Client requires a `refreshToken` or `accessToken`. " +
          "Create one in Beds24 → Settings → Apis → Token.",
      });
    }
    this.config = config;
    this.apiBase = (config.baseUrl ?? DEFAULT_API_BASE).replace(/\/$/, "");
    const f = config.fetch ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new Beds24Error({
        code: "NETWORK_ERROR",
        message:
          "No `fetch` implementation available. Provide `config.fetch` or run on Node 18+.",
      });
    }
    this.fetchImpl = f;
  }

  // --- Authentication -------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.cachedToken;
    }

    // Use a directly-supplied access token once, before falling back to refresh.
    if (this.config.accessToken && !this.staticTokenUsed) {
      this.staticTokenUsed = true;
      this.cachedToken = this.config.accessToken;
      this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
      return this.cachedToken;
    }

    if (!this.config.refreshToken) {
      throw new Beds24Error({
        code: "AUTH_ERROR",
        message: "Access token expired and no `refreshToken` is configured to renew it.",
      });
    }

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.apiBase}/authentication/token`, {
        method: "GET",
        headers: { refreshToken: this.config.refreshToken, accept: "application/json" },
      });
    } catch (cause) {
      throw new Beds24Error({
        code: "NETWORK_ERROR",
        message: "Failed to reach Beds24 to refresh the access token.",
        cause,
      });
    }

    if (!res.ok) {
      throw new Beds24Error({
        code: "AUTH_ERROR",
        message: `Beds24 token refresh failed (${res.status}).`,
        status: res.status,
        body: await safeBody(res),
      });
    }

    const data = (await res.json()) as { token?: string; expiresIn?: number };
    if (!data.token) {
      throw new Beds24Error({
        code: "AUTH_ERROR",
        message: "Beds24 token refresh returned no token.",
        body: data,
      });
    }
    this.cachedToken = data.token;
    this.tokenExpiresAt = Date.now() + (data.expiresIn ?? 86400) * 1000;
    return this.cachedToken;
  }

  // --- Core request helper --------------------------------------------------

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let res = await this.send(path, options);

    // On 401, force a token refresh once and retry.
    if (res.status === 401) {
      this.cachedToken = null;
      this.tokenExpiresAt = 0;
      this.staticTokenUsed = true; // don't reuse a now-rejected static token
      res = await this.send(path, options);
    }

    if (!res.ok) {
      throw new Beds24Error({
        code: Beds24Error.codeFromStatus(res.status),
        message: `Beds24 request failed: ${options.method ?? "GET"} ${path} → ${res.status}`,
        status: res.status,
        body: await safeBody(res),
      });
    }

    try {
      return (await res.json()) as T;
    } catch (cause) {
      throw new Beds24Error({
        code: "PARSE_ERROR",
        message: `Beds24 returned a non-JSON response for ${path}.`,
        status: res.status,
        cause,
      });
    }
  }

  private async send(path: string, options: RequestInit): Promise<Response> {
    const token = await this.getAccessToken();
    try {
      return await this.fetchImpl(`${this.apiBase}${path}`, {
        ...options,
        headers: {
          token,
          accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    } catch (cause) {
      throw new Beds24Error({
        code: "NETWORK_ERROR",
        message: `Network error calling Beds24: ${options.method ?? "GET"} ${path}.`,
        cause,
      });
    }
  }

  // --- Properties -----------------------------------------------------------

  async getProperties(): Promise<Beds24Property[]> {
    const json = await this.request<{ data?: Beds24Property[] } | Beds24Property[]>(
      "/properties?includeAllRooms=true",
    );
    return unwrap(json);
  }

  // --- Calendar -------------------------------------------------------------

  async getCalendar(
    startDate: string,
    endDate: string,
    propertyId?: number,
  ): Promise<Beds24RoomCalendar[]>;
  async getCalendar(params: GetCalendarParams): Promise<Beds24RoomCalendar[]>;
  async getCalendar(
    startDateOrParams: string | GetCalendarParams,
    endDate?: string,
    propertyId?: number,
  ): Promise<Beds24RoomCalendar[]> {
    const p: GetCalendarParams =
      typeof startDateOrParams === "string"
        ? { startDate: startDateOrParams, endDate: endDate!, propertyId }
        : startDateOrParams;

    const params = new URLSearchParams({
      startDate: p.startDate,
      endDate: p.endDate,
      includeNumAvail: "true",
      includeMinStay: "true",
      includePrices: "true",
    });
    if (p.propertyId) params.append("propertyId", String(p.propertyId));
    if (p.roomId) params.append("roomId", String(p.roomId));

    const json = await this.request<{ data?: Beds24RoomCalendar[] } | Beds24RoomCalendar[]>(
      `/inventory/rooms/calendar?${params}`,
    );
    return unwrap(json);
  }

  // --- Offers / Availability ------------------------------------------------

  async getOffers(
    arrival: string,
    departure: string,
    numAdults: number,
    propertyId?: number,
  ): Promise<Beds24Offer[]>;
  async getOffers(params: GetOffersParams): Promise<Beds24Offer[]>;
  async getOffers(
    arrivalOrParams: string | GetOffersParams,
    departure?: string,
    numAdults?: number,
    propertyId?: number,
  ): Promise<Beds24Offer[]> {
    const p: GetOffersParams =
      typeof arrivalOrParams === "string"
        ? { arrival: arrivalOrParams, departure: departure!, numAdults: numAdults!, propertyId }
        : arrivalOrParams;

    const params = new URLSearchParams({
      arrival: p.arrival,
      departure: p.departure,
      numAdults: String(p.numAdults),
    });
    if (p.numChildren) params.append("numChildren", String(p.numChildren));
    if (p.propertyId) params.append("propertyId", String(p.propertyId));

    const json = await this.request<{ data?: Beds24Offer[] } | Beds24Offer[]>(
      `/inventory/rooms/offers?${params}`,
    );
    return unwrap(json);
  }

  // --- Bookings -------------------------------------------------------------

  /**
   * Retrieve bookings, optionally filtered. Returns the flat list of bookings;
   * use {@link Beds24Client.getBookingsPage} when you need pagination metadata.
   */
  async getBookings(filters: GetBookingsParams = {}): Promise<Beds24Booking[]> {
    return (await this.getBookingsPage(filters)).data;
  }

  /** Like {@link Beds24Client.getBookings} but returns the full paginated envelope. */
  async getBookingsPage(filters: GetBookingsParams = {}): Promise<Beds24BookingsResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, String(v));
      } else {
        params.append(key, String(value));
      }
    }
    const qs = params.toString();
    const json = await this.request<Beds24BookingsResponse | Beds24Booking[]>(
      `/bookings${qs ? `?${qs}` : ""}`,
    );
    if (Array.isArray(json)) {
      return { success: true, count: json.length, data: json };
    }
    return { ...json, data: json.data ?? [] };
  }

  async createBooking(booking: Beds24BookingRequest): Promise<Beds24BookingResponse> {
    const data = await this.request<Beds24BookingResponse | Beds24BookingResponse[]>("/bookings", {
      method: "POST",
      body: JSON.stringify([booking]),
    });
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.success === false) {
      throw new Beds24Error({
        code: "VALIDATION_ERROR",
        message: `Beds24 rejected the booking: ${result.errors?.join("; ") ?? "unknown error"}`,
        body: result,
      });
    }
    return result;
  }
}

// --- helpers ----------------------------------------------------------------

function unwrap<T>(json: { data?: T[] } | T[]): T[] {
  return Array.isArray(json) ? json : (json.data ?? []);
}

async function safeBody(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}
