# beds24-sdk

Typed, dependency-free [Beds24 API v2](https://beds24.com) client for JavaScript and TypeScript.

The core of the [Beds24 developer platform](../../README.md): a thin wrapper that handles
authentication, token refresh, and structured error handling — and nothing else. Payments,
email, LINE, and framework integrations are built _on top_ of this package, never inside it.

## Features

- 🔑 **Auth handled for you** — exchanges your refresh token for access tokens, caches them, and retries once on `401`.
- 📅 **Calendar & availability** — room calendars with prices/min-stay, and bookable offers.
- 📖 **Booking retrieval & creation** — list bookings with filters (incremental sync friendly), create new ones.
- 🧱 **Structured errors** — every failure is a `Beds24Error` with a stable `.code`.
- 🪶 **Zero runtime dependencies** — uses the platform `fetch` (Node 18+, edge, browsers).
- 🧩 **Fully typed** — ships its own `.d.ts`.

## Install

```bash
npm install beds24-sdk
```

> **Note:** the package name on the npm registry may be scoped (see the repo root README) —
> check the badge there for the exact install name.

## Quick start

```ts
import { Beds24Client } from "beds24-sdk";

const client = new Beds24Client({
  refreshToken: process.env.BEDS24_REFRESH_TOKEN,
});

// Bookings
const bookings = await client.getBookings({ arrivalFrom: "2026-06-01" });

// Availability for a stay
const offers = await client.getOffers({
  arrival: "2026-06-12",
  departure: "2026-06-14",
  numAdults: 2,
});

// Create a booking
await client.createBooking({
  roomId: 12345,
  arrival: "2026-06-12",
  departure: "2026-06-14",
  numAdult: 2,
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "+81-90-0000-0000",
  status: "confirmed",
});
```

## Authentication

Create a refresh token in **Beds24 → Settings → Apis → Token** and pass it as `refreshToken`.
The client fetches a short-lived access token on demand, caches it until ~5 minutes before
expiry, and transparently refreshes after a `401`.

You can also pass a pre-fetched `accessToken` directly (it will be used until it expires, then
the client falls back to the refresh token if one was provided):

```ts
new Beds24Client({ accessToken: "..." });
new Beds24Client({ refreshToken: "...", accessToken: "..." });
```

## Error handling

```ts
import { Beds24Client, Beds24Error, isBeds24Error } from "beds24-sdk";

try {
  await client.getBookings();
} catch (err) {
  if (isBeds24Error(err)) {
    switch (err.code) {
      case "AUTH_ERROR":
        // invalid/expired refresh token
        break;
      case "RATE_LIMIT":
        // 429 — back off and retry
        break;
      default:
        console.error(err.code, err.status, err.body);
    }
  }
}
```

`Beds24Error.code` is one of:

| Code               | When                                                        |
| ------------------ | ---------------------------------------------------------- |
| `AUTH_ERROR`       | Missing credentials, failed refresh, or `401`/`403`.       |
| `RATE_LIMIT`       | `429 Too Many Requests`.                                   |
| `NOT_FOUND`        | `404`.                                                     |
| `VALIDATION_ERROR` | `400`/`422`, or Beds24 rejected a booking (`success:false`). |
| `API_ERROR`        | Any other non-2xx response.                                |
| `PARSE_ERROR`      | Response body was not valid JSON.                          |
| `NETWORK_ERROR`    | `fetch` itself threw (offline, DNS, TLS, timeout).         |

## API

| Method | Description |
| ------ | ----------- |
| `getProperties()` | All properties with their rooms. |
| `getCalendar(startDate, endDate, propertyId?)` / `getCalendar(params)` | Room calendars with prices and min-stay. |
| `getOffers(arrival, departure, numAdults, propertyId?)` / `getOffers(params)` | Bookable offers for a stay. |
| `getBookings(filters?)` | Bookings as a flat array. |
| `getBookingsPage(filters?)` | Bookings with pagination metadata. |
| `createBooking(request)` | Create a booking; throws on `success:false`. |

## License

MIT
