import type {
  Beds24RoomCalendar,
  CheckoutRequest,
  CheckoutResult,
  WebhookResult,
} from "@sleepy-beds/beds24-booking-sdk";

/**
 * The subset of `BookingSDK` these handlers use. `BookingSDK` satisfies it
 * structurally, so there is no runtime dependency on the booking package — only
 * type-level. You can also pass any compatible object (e.g. in tests).
 */
export interface Beds24NextSDK {
  checkAvailability(checkIn: string, checkOut: string, guests: number): Promise<boolean>;
  getCalendar(startDate: string, endDate: string): Promise<Beds24RoomCalendar[]>;
  createCheckout(
    request: CheckoutRequest,
  ): Promise<CheckoutResult | (Record<string, unknown> & { error?: string })>;
  handlePaymentWebhook(rawBody: string, signature: string): Promise<WebhookResult>;
}

/** A Web-standard route handler, compatible with the Next.js App Router. */
export type RouteHandler = (req: Request) => Promise<Response>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Map a thrown error to an HTTP response. Recognizes Beds24Error by its `.code`. */
function toErrorResponse(err: unknown): Response {
  if (err && typeof err === "object" && typeof (err as { code?: unknown }).code === "string") {
    const code = (err as { code: string }).code;
    const message = (err as { message?: string }).message ?? "Beds24 error";
    const status =
      code === "VALIDATION_ERROR"
        ? 400
        : code === "RATE_LIMIT"
          ? 429
          : code === "NOT_FOUND"
            ? 404
            : 502; // AUTH_ERROR, API_ERROR, NETWORK_ERROR, PARSE_ERROR
    return json({ error: message, code }, status);
  }
  return json({ error: "Internal server error" }, 500);
}

function guard(fn: RouteHandler): RouteHandler {
  return async (req) => {
    try {
      return await fn(req);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/**
 * `GET /api/beds24/availability?checkIn=&checkOut=&guests=`
 * → `{ available: boolean }`
 */
export function availabilityHandler(sdk: Beds24NextSDK): RouteHandler {
  return guard(async (req) => {
    const url = new URL(req.url);
    const checkIn = url.searchParams.get("checkIn");
    const checkOut = url.searchParams.get("checkOut");
    const guests = Number(url.searchParams.get("guests") ?? "2");
    if (!checkIn || !checkOut) {
      return json({ error: "checkIn and checkOut are required" }, 400);
    }
    const available = await sdk.checkAvailability(checkIn, checkOut, guests);
    return json({ available });
  });
}

/**
 * `GET /api/beds24/calendar?startDate=&endDate=`
 * → `Beds24RoomCalendar[]`
 */
export function calendarHandler(sdk: Beds24NextSDK): RouteHandler {
  return guard(async (req) => {
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    if (!startDate || !endDate) {
      return json({ error: "startDate and endDate are required" }, 400);
    }
    return json(await sdk.getCalendar(startDate, endDate));
  });
}

/**
 * `POST /api/beds24/checkout` with a JSON `CheckoutRequest` body
 * → `{ url, sessionId }` or a `400` with the checkout error.
 */
export function checkoutHandler(sdk: Beds24NextSDK): RouteHandler {
  return guard(async (req) => {
    const body = (await req.json()) as CheckoutRequest;
    const result = await sdk.createCheckout(body);
    if (!("url" in result) || !result.url) {
      return json(result, 400);
    }
    return json(result);
  });
}

/**
 * `POST /api/beds24/webhook` — Stripe `checkout.session.completed`.
 * Reads the raw body and `stripe-signature` header.
 */
export function webhookHandler(sdk: Beds24NextSDK): RouteHandler {
  return guard(async (req) => {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";
    const result = await sdk.handlePaymentWebhook(body, signature);
    return json(result, result.error ? 400 : 200);
  });
}

/** Convenience: build all handlers from one SDK instance. */
export function createBeds24Handlers(sdk: Beds24NextSDK) {
  return {
    availability: availabilityHandler(sdk),
    calendar: calendarHandler(sdk),
    checkout: checkoutHandler(sdk),
    webhook: webhookHandler(sdk),
  };
}
