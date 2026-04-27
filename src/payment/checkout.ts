import type Stripe from "stripe";
import type { CheckoutRequest, CheckoutResult, PropertyConfig } from "../types";
import type { PriceCache } from "../pricing/cache";
import { validateCheckoutRequest } from "./validation";

export interface CreateCheckoutParams {
  request: CheckoutRequest;
  stripe: Stripe;
  priceCache: PriceCache;
  property: PropertyConfig;
  baseUrl: string;
}

/**
 * Stable error codes returned by {@link createCheckoutSession}. Use these
 * (rather than the English `error` text) when localizing or branching on
 * errors in your UI.
 */
export type CheckoutErrorCode =
  | "VALIDATION_FAILED"
  | "INVALID_PRICE"
  | "PRICE_CACHE_EXPIRED"
  | "PRICE_MISMATCH";

export interface CheckoutError {
  /** Stable, locale-independent error code. */
  code: CheckoutErrorCode;
  /** Default English message. Consumers should localize from {@link code}. */
  error: string;
  /** Suggested HTTP status to return to the client. */
  status: number;
}

export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<CheckoutResult | CheckoutError> {
  const { request, stripe, priceCache, property, baseUrl } = params;

  // Validate input
  const validation = validateCheckoutRequest(request, property);
  if (!validation.valid) {
    return {
      code: "VALIDATION_FAILED",
      error: validation.errors[0].message,
      status: 400,
    };
  }

  const s = validation.sanitized!;

  // Price verification
  const clientTotal = Math.floor(Number(request.totalPrice) || 0);
  if (clientTotal <= 0) {
    return {
      code: "INVALID_PRICE",
      error: "Could not compute a valid price.",
      status: 400,
    };
  }

  const cached = priceCache.calculateTotal(
    request.checkIn,
    request.checkOut,
    s.guests,
    property.extraGuestThreshold,
    property.extraGuestSurcharge,
  );

  if (cached === null) {
    return {
      code: "PRICE_CACHE_EXPIRED",
      error: "Cached price information is missing or expired. Reload the page and try again.",
      status: 409,
    };
  }

  if (clientTotal !== cached.total) {
    console.error("Price tamper detected", { clientTotal, serverTotal: cached.total });
    return {
      code: "PRICE_MISMATCH",
      error: "Submitted total does not match the server-computed price.",
      status: 409,
    };
  }

  const totalPrice = cached.total;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: s.guestEmail,
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: {
            name: `${property.name} — ${s.nights} ${s.nights === 1 ? "night" : "nights"}`,
            description: `${request.checkIn} → ${request.checkOut} / ${s.guests} ${s.guests === 1 ? "guest" : "guests"}`,
          },
          unit_amount: totalPrice,
        },
        quantity: 1,
      },
    ],
    metadata: {
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      guestName: s.guestName,
      guestNameKana: s.guestNameKana,
      guestEmail: s.guestEmail,
      guestPhone: s.guestPhone,
      guests: String(s.guests),
      nights: String(s.nights),
      checkInTime: s.checkInTime,
      notes: s.notes,
    },
    success_url: `${baseUrl}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/reservation`,
  });

  return { url: session.url!, sessionId: session.id };
}

export function isCheckoutError(result: CheckoutResult | CheckoutError): result is CheckoutError {
  return "error" in result;
}
