// Typed client for the Hono API. Mirrors server/service.ts DTOs.

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

export interface DayInfo {
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

export interface Reservation {
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

export interface CheckoutBody {
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestNameKana: string;
  guestEmail: string;
  guestPhone: string;
  checkInTime?: string;
  notes?: string;
  totalPrice: number;
}

class ApiError extends Error {}

async function unwrap<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `エラー (${res.status})`);
  return data as T;
}

export async function getProperty(): Promise<{ property: PublicProperty; mode: "live" | "mock" }> {
  return unwrap(await fetch("/api/property"));
}

export async function getCalendar(start: string, end: string): Promise<DayInfo[]> {
  const res = await fetch(`/api/calendar?start=${start}&end=${end}`);
  return (await unwrap<{ days: DayInfo[] }>(res)).days;
}

export async function getQuote(checkIn: string, checkOut: string, guests: number): Promise<Quote> {
  const res = await fetch(`/api/quote?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
  return unwrap<Quote>(res);
}

export async function createCheckout(body: CheckoutBody): Promise<{ url: string }> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return unwrap<{ url: string }>(res);
}

export async function getReservation(sessionId: string): Promise<Reservation> {
  const res = await fetch(`/api/reservation/${sessionId}`);
  return (await unwrap<{ reservation: Reservation }>(res)).reservation;
}

export { ApiError };
