# @sleepy-beds/nextjs

Next.js **App Router** route handlers for the Beds24 booking SDK. Mount availability,
calendar, checkout, and Stripe-webhook endpoints in a few lines.

Part of the [Beds24 developer platform](../../README.md). Wraps
[`@sleepy-beds/booking`](../booking). Zero runtime dependencies — the handlers
are plain Web `Request → Response` functions, so they also work on any Web-standard runtime
(Edge, Bun, Hono…).

## Install

```bash
npm install @sleepy-beds/nextjs @sleepy-beds/booking
```

## Usage

Create one SDK instance and expose the handlers from your route files.

```ts
// lib/booking.ts
import { BookingSDK } from "@sleepy-beds/booking";

export const sdk = new BookingSDK({
  /* beds24 / stripe / email / property / baseUrl */
});
```

```ts
// app/api/beds24/availability/route.ts
import { availabilityHandler } from "@sleepy-beds/nextjs";
import { sdk } from "@/lib/booking";

export const GET = availabilityHandler(sdk);
```

```ts
// app/api/beds24/checkout/route.ts
import { checkoutHandler } from "@sleepy-beds/nextjs";
import { sdk } from "@/lib/booking";

export const POST = checkoutHandler(sdk);
```

```ts
// app/api/beds24/webhook/route.ts
import { webhookHandler } from "@sleepy-beds/nextjs";
import { sdk } from "@/lib/booking";

export const POST = webhookHandler(sdk);
```

Or build them all at once:

```ts
import { createBeds24Handlers } from "@sleepy-beds/nextjs";
const handlers = createBeds24Handlers(sdk);
// handlers.availability / .calendar / .checkout / .webhook
```

## Endpoints

| Handler | Method | Query / Body | Response |
| ------- | ------ | ------------ | -------- |
| `availabilityHandler` | GET | `?checkIn&checkOut&guests` | `{ available }` |
| `calendarHandler` | GET | `?startDate&endDate` | `Beds24RoomCalendar[]` |
| `checkoutHandler` | POST | `CheckoutRequest` JSON | `{ url, sessionId }` |
| `webhookHandler` | POST | raw body + `stripe-signature` | `WebhookResult` |

## Error handling

Thrown `Beds24Error`s are mapped to HTTP statuses automatically:

| `code` | Status |
| ------ | ------ |
| `VALIDATION_ERROR` | 400 |
| `NOT_FOUND` | 404 |
| `RATE_LIMIT` | 429 |
| `AUTH_ERROR` / `API_ERROR` / `NETWORK_ERROR` / `PARSE_ERROR` | 502 |
| anything else | 500 |

## License

MIT
