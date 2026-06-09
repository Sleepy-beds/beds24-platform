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

export interface CheckoutError {
  error: string;
  status: number;
}

export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<CheckoutResult | CheckoutError> {
  const { request, stripe, priceCache, property, baseUrl } = params;

  // Validate input
  const validation = validateCheckoutRequest(request, property);
  if (!validation.valid) {
    return { error: validation.errors[0].message, status: 400 };
  }

  const s = validation.sanitized!;

  // Price verification
  const clientTotal = Math.floor(Number(request.totalPrice) || 0);
  if (clientTotal <= 0) {
    return { error: "料金の計算に失敗しました", status: 400 };
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
      error: "料金情報の有効期限が切れました。ページを再読み込みしてください。",
      status: 409,
    };
  }

  if (clientTotal !== cached.total) {
    console.error("Price tamper detected!", { clientTotal, serverTotal: cached.total });
    return {
      error: "料金が一致しません。ページを再読み込みして最新の料金をご確認ください。",
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
            name: `${property.name} — ${s.nights}泊`,
            description: `${request.checkIn.replace(/-/g, "/")} 〜 ${request.checkOut.replace(/-/g, "/")} / ${s.guests}名`,
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
