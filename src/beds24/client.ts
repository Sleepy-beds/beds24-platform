import type {
  Beds24BookingRequest,
  Beds24BookingResponse,
  Beds24Config,
  Beds24Offer,
  Beds24Property,
  Beds24RoomCalendar,
} from "../types";

const API_BASE = "https://beds24.com/api/v2";

export class Beds24Client {
  private config: Beds24Config;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;
  private envTokenTried = false;

  constructor(config: Beds24Config) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.cachedToken;
    }

    if (this.config.accessToken && !this.envTokenTried) {
      this.envTokenTried = true;
      this.cachedToken = this.config.accessToken;
      this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
      return this.cachedToken;
    }

    const res = await fetch(`${API_BASE}/authentication/token`, {
      method: "GET",
      headers: {
        refreshToken: this.config.refreshToken,
        accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Beds24 token refresh failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as { token: string; expiresIn?: number };
    this.cachedToken = data.token;
    this.tokenExpiresAt = Date.now() + (data.expiresIn ?? 86400) * 1000;
    return this.cachedToken!;
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        token,
        accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (res.status === 401) {
      this.cachedToken = null;
      this.tokenExpiresAt = 0;
      const newToken = await this.getAccessToken();
      return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          token: newToken,
          accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    }

    return res;
  }

  async getProperties(): Promise<Beds24Property[]> {
    const res = await this.fetch("/properties?includeAllRooms=true");
    if (!res.ok) {
      throw new Error(`Failed to fetch properties: ${res.status}`);
    }
    return (await res.json()) as Beds24Property[];
  }

  async getCalendar(
    startDate: string,
    endDate: string,
    propertyId?: number,
  ): Promise<Beds24RoomCalendar[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
      includeNumAvail: "true",
      includeMinStay: "true",
      includePrices: "true",
    });
    if (propertyId) {
      params.append("propertyId", String(propertyId));
    }

    const res = await this.fetch(`/inventory/rooms/calendar?${params}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch calendar: ${res.status} ${text}`);
    }
    const json = (await res.json()) as { data?: Beds24RoomCalendar[] } | Beds24RoomCalendar[];
    return Array.isArray(json) ? json : (json.data ?? []);
  }

  async getOffers(
    arrival: string,
    departure: string,
    numAdults: number,
    propertyId?: number,
  ): Promise<Beds24Offer[]> {
    const params = new URLSearchParams({
      arrival,
      departure,
      numAdults: String(numAdults),
    });
    if (propertyId) {
      params.append("propertyId", String(propertyId));
    }

    const res = await this.fetch(`/inventory/rooms/offers?${params}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch offers: ${res.status}`);
    }
    return (await res.json()) as Beds24Offer[];
  }

  async createBooking(booking: Beds24BookingRequest): Promise<Beds24BookingResponse> {
    const res = await this.fetch("/bookings", {
      method: "POST",
      body: JSON.stringify([booking]),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create booking: ${res.status} ${text}`);
    }

    const data = (await res.json()) as Beds24BookingResponse | Beds24BookingResponse[];
    return Array.isArray(data) ? data[0] : data;
  }
}
