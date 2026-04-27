# beds24-booking-sdk

All-in-one booking SDK integrating [Beds24](https://beds24.com/) (PMS), [Stripe](https://stripe.com/) (payments), and [Resend](https://resend.com/) (email).

Handles availability checks, pricing, Stripe Checkout, Beds24 booking creation, and email notifications in a single workflow.

[日本語ドキュメント](./README.ja.md)

## Installation

```bash
npm install beds24-booking-sdk stripe resend
```

`stripe` and `resend` are peer dependencies. `resend` is optional if you don't need email notifications.

## Setup

```typescript
import { BookingSDK } from "beds24-booking-sdk";

const sdk = new BookingSDK({
  beds24: {
    refreshToken: process.env.BEDS24_REFRESH_TOKEN!,
    accessToken: process.env.BEDS24_ACCESS_TOKEN, // optional (auto-refreshes)
    propertyId: 123456,
    roomId: 654321,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY!,
    from: "My Property <noreply@example.com>",
    owner: "owner@example.com",
    replyTo: "info@example.com", // optional
  },
  property: {
    name: "My Property",
    nameEn: "My Property", // optional — used in email header subtitle
    maxGuests: 10,
    checkInTime: "15:00",
    checkOutTime: "10:00",
    address: "123 Main St, Tokyo, Japan",
    phone: "03-1234-5678",
    basePrice: 15000,       // per night (weekday)
    weekendPrice: 20000,    // per night (weekend)
    extraGuestThreshold: 2, // surcharge applies above this number
    extraGuestSurcharge: 3000, // per extra guest per night
    validCheckInTimes: ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00"],
    maxStayNights: 30,
  },
  baseUrl: "https://example.com",
});
```

## Usage

### Calendar & Availability

```typescript
// Fetch calendar with pricing (also populates server-side price cache)
const calendar = await sdk.getCalendar("2026-04-01", "2027-03-31");

// Check availability for specific dates
const available = await sdk.checkAvailability("2026-05-01", "2026-05-03", 4);
```

### Pricing

```typescript
// Client-side: calculate from availability data
const price = sdk.calculatePrice("2026-05-01", "2026-05-03", availabilityData, 4);

// Server-side: verify against cache (prevents price tampering)
const verified = sdk.verifyPriceFromCache("2026-05-01", "2026-05-03", 4);
```

### Stripe Checkout

```typescript
import { isCheckoutError } from "beds24-booking-sdk";

const result = await sdk.createCheckout({
  checkIn: "2026-05-01",
  checkOut: "2026-05-03",
  guestName: "John Doe",
  guestNameKana: "",
  guestEmail: "john@example.com",
  guestPhone: "090-1234-5678",
  guests: 4,
  totalPrice: 46000,
  checkInTime: "16:00",
  notes: "Late arrival",
});

if (isCheckoutError(result)) {
  console.error(result.error); // validation error or price mismatch
} else {
  redirect(result.url); // Stripe Checkout URL
}
```

### Webhook Handler

Handles Stripe `checkout.session.completed` events — creates a Beds24 booking and sends confirmation emails in one call.

```typescript
// Next.js API Route example
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  const result = await sdk.handlePaymentWebhook(body, signature);

  if (result.error) {
    return Response.json({ error: result.error }, { status: 500 });
  }
  return Response.json(result);
}
```

#### Idempotency in production ⚠️

Stripe retries webhook deliveries on non-2xx responses. The default
`InMemoryIdempotencyStore` is **process-local** — on serverless or
multi-instance deployments, restarts and concurrent invocations across
instances will not share dedup state and you may end up creating duplicate
Beds24 bookings.

For production, supply a shared, persistent store via `idempotencyStore`:

```typescript
import type { IdempotencyStore } from "beds24-booking-sdk";

const redisStore: IdempotencyStore = {
  async has(id) {
    return (await redis.exists(`stripe:evt:${id}`)) === 1;
  },
  async add(id) {
    await redis.set(`stripe:evt:${id}`, "1", "EX", 60 * 60 * 24 * 7); // 7 days
  },
};

const sdk = new BookingSDK({
  // ...
  idempotencyStore: redisStore,
});
```

### Email Templates

The SDK ships with built-in **Japanese-localized** confirmation email
templates. They are used by `handlePaymentWebhook` by default. You can
also call them directly:

```typescript
import {
  generateBookingConfirmationEmail,
  generateOwnerNotificationEmail,
} from "beds24-booking-sdk/email";

const guestEmail = generateBookingConfirmationEmail(bookingData, propertyConfig);
const ownerEmail = generateOwnerNotificationEmail(bookingData, propertyConfig);
```

For **non-Japanese audiences**, supply your own templates via
`BookingSDKConfig.templates` — the webhook handler will use them instead of
the Japanese defaults:

```typescript
import type { BookingEmailTemplates } from "beds24-booking-sdk";

const englishTemplates: BookingEmailTemplates = {
  guest: (data, property) => ({
    subject: `[${property.name}] Reservation confirmed (${data.checkIn} → ${data.checkOut})`,
    html: `<p>Dear ${data.guestName}, your booking ${data.bookingId} is confirmed…</p>`,
    text: `Dear ${data.guestName}, your booking ${data.bookingId} is confirmed…`,
  }),
  owner: (data) => ({
    subject: `[New booking] ${data.guestName} ${data.checkIn}→${data.checkOut}`,
    html: `<pre>${data.bookingId} / ${data.guestEmail}</pre>`,
    text: `${data.bookingId} / ${data.guestEmail}`,
  }),
};

const sdk = new BookingSDK({ /* ... */, templates: englishTemplates });
```

### Error handling & localization

`validateCheckoutRequest` and `createCheckout` return errors with **stable,
locale-independent codes** (`ValidationErrorCode`, `CheckoutErrorCode`) plus
a default English `message`. Switch on `code` in your UI rather than parsing
the message:

```typescript
import { isCheckoutError } from "beds24-booking-sdk";

const result = await sdk.createCheckout(req);
if (isCheckoutError(result)) {
  // result.code is one of:
  //   "VALIDATION_FAILED" | "INVALID_PRICE" | "PRICE_CACHE_EXPIRED" | "PRICE_MISMATCH"
  showLocalizedError(result.code);
}
```

## Submodule Imports

Import only what you need:

```typescript
import { Beds24Client } from "beds24-booking-sdk/beds24";
import { PriceCache, calculateTotalPrice } from "beds24-booking-sdk/pricing";
import { EmailSender } from "beds24-booking-sdk/email";
import { validateCheckoutRequest } from "beds24-booking-sdk/payment";
```

## Requirements

- Node.js >= 18
- [Beds24 API V2](https://beds24.com/api/v2) account (refresh token)
- [Stripe](https://stripe.com/) account (secret key + webhook secret)
- [Resend](https://resend.com/) account (API key) — only if using email features

## License

MIT
