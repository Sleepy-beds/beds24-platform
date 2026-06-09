# beds24-line

LINE notifications for [Beds24](https://beds24.com) booking events — new bookings,
cancellations, and check-in reminders — delivered to a LINE user, group, or room.

Part of the [Beds24 developer platform](../../README.md), built on
[`beds24-sdk`](../beds24-sdk). Aimed at small inns, guesthouses, and minpaku in Japan
who want a booking ping in their LINE group.

> **Uses the LINE Messaging API**, not the discontinued LINE Notify (which shut down in
> March 2025). You need a Messaging API channel and its channel access token.

## Install

```bash
npm install @sleepy-beds/beds24-line
```

## Quick start

```ts
import { Beds24LineNotifier } from "@sleepy-beds/beds24-line";

const line = new Beds24LineNotifier({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  to: process.env.LINE_GROUP_ID, // default target (userId / groupId / roomId)
});

await line.notify({
  event: "booking_created",
  booking: {
    guestName: "John Smith",
    checkIn: "2026-06-12",
    checkOut: "2026-06-14",
    guests: 2,
    totalPrice: 24000,
    phone: "090-1234-5678",
    propertyName: "古民家のらり",
  },
});
```

Produces a LINE message like:

```
🎉 新規予約が入りました

🏠 古民家のらり
📅 6/12(金) → 6/14(日) (2泊)
👤 John Smith 様
👥 2名
💰 ¥24,000
☎️ 090-1234-5678
```

## Events

| Event | Convenience method | Template |
| ----- | ------------------ | -------- |
| `booking_created` | `notifyBookingCreated(booking, to?)` | New reservation summary with price & phone. |
| `booking_cancelled` | `notifyBookingCancelled(booking, to?)` | Cancellation notice. |
| `checkin_reminder` | `notifyCheckinReminder(booking, to?)` | "Guest checks in tomorrow" reminder. |

## From a Beds24 booking

Pair with `beds24-sdk` to notify directly from live bookings:

```ts
import { Beds24Client } from "@sleepy-beds/beds24-sdk";
import { Beds24LineNotifier, fromBeds24Booking } from "@sleepy-beds/beds24-line";

const client = new Beds24Client({ refreshToken: process.env.BEDS24_REFRESH_TOKEN });
const line = new Beds24LineNotifier({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  to: process.env.LINE_GROUP_ID,
});

// e.g. a daily check-in reminder cron
const tomorrow = "2026-06-12";
const arrivals = await client.getBookings({ arrivalFrom: tomorrow, arrivalTo: tomorrow });
for (const b of arrivals) {
  await line.notifyCheckinReminder(fromBeds24Booking(b, { propertyName: "古民家のらり" }));
}
```

## Custom messages

Bypass the templates with any [LINE message object](https://developers.line.biz/en/reference/messaging-api/#message-objects):

```ts
await line.notify({
  event: "booking_created",
  booking,
  messages: [{ type: "text", text: "🎉 予約が入りました！" }],
});

// or low-level
await line.push(groupId, [{ type: "text", text: "..." }]);
```

## Error handling

Every failure is a `LineError` with a stable `.code`:

| Code | When |
| ---- | ---- |
| `CONFIG_ERROR` | Missing token, missing push target, or no `fetch`. |
| `API_ERROR` | LINE returned a non-2xx response (`.status`, `.body` populated). |
| `NETWORK_ERROR` | `fetch` itself threw. |

## License

MIT
