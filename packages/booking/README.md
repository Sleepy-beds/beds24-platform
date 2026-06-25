# @sleepy-beds/booking

All-in-one booking SDK integrating [Beds24](https://beds24.com/) (PMS), [Stripe](https://stripe.com/) (payments), and [Resend](https://resend.com/) (email).

Handles availability checks, pricing, Stripe Checkout, Beds24 booking creation, and email notifications in a single workflow.

[日本語ドキュメント](./README.ja.md)

## Installation

```bash
npm install @sleepy-beds/booking stripe resend
```

`stripe` and `resend` are peer dependencies. `resend` is optional if you don't need email notifications.

## Setup

```typescript
import { BookingSDK } from "@sleepy-beds/booking";

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
import { isCheckoutError } from "@sleepy-beds/booking";

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

### LINE notification on booking (optional hook)

Pass `onBookingCreated` in the SDK config to fire a side-effect after a paid booking is
created — e.g. a LINE push via [`@sleepy-beds/line`](../line). It runs inside
the webhook, is **best-effort** (errors are reported in `result.results.notification`, never
failing the booking), and keeps this package decoupled from any specific notifier.

```typescript
import { BookingSDK } from "@sleepy-beds/booking";
import { Beds24LineNotifier } from "@sleepy-beds/line";

const line = new Beds24LineNotifier({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  to: process.env.LINE_GROUP_ID,
});

const sdk = new BookingSDK({
  /* …beds24 / stripe / email / property… */
  onBookingCreated: (b) =>
    line.notifyBookingCreated({
      guestName: b.guestName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guests: b.guests,
      totalPrice: b.totalPrice,
      phone: b.guestPhone,
    }),
});
// → 🎉 新規予約が入りました … delivered to your LINE group
```

### Email Templates

Use the built-in Japanese booking confirmation templates standalone:

```typescript
import {
  generateBookingConfirmationEmail,
  generateOwnerNotificationEmail,
} from "@sleepy-beds/booking/email";

const guestEmail = generateBookingConfirmationEmail(bookingData, propertyConfig);
const ownerEmail = generateOwnerNotificationEmail(bookingData, propertyConfig);
```

## Submodule Imports

Import only what you need:

```typescript
import { Beds24Client } from "@sleepy-beds/sdk";
import { PriceCache, calculateTotalPrice } from "@sleepy-beds/booking/pricing";
import { EmailSender } from "@sleepy-beds/booking/email";
import { validateCheckoutRequest } from "@sleepy-beds/booking/payment";
```

## Requirements

- Node.js >= 18
- [Beds24 API V2](https://beds24.com/api/v2) account (refresh token)
- [Stripe](https://stripe.com/) account (secret key + webhook secret)
- [Resend](https://resend.com/) account (API key) — only if using email features

## License

MIT
