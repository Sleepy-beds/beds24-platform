# Example: LINE check-in reminder

A daily job that pushes a LINE reminder for every guest arriving **tomorrow**.

Uses [`@sleepy-beds/sdk`](../../packages/sdk) to read arrivals and
[`@sleepy-beds/line`](../../packages/line) to notify.

## Run

```bash
# from the repo root: build the workspace packages once
pnpm install
pnpm -r build

cd examples/line-checkin-reminder
cp .env.example .env   # fill in your tokens
pnpm start             # runs: tsx src/reminder.ts
```

## Schedule it (cron, once a day at 18:00)

```cron
0 18 * * *  cd /path/to/examples/line-checkin-reminder && pnpm start >> reminder.log 2>&1
```

The same pattern works for `booking_created` / `booking_cancelled` — swap
`notifyCheckinReminder` for `notifyBookingCreated` / `notifyBookingCancelled`, or wire
`onBookingCreated` into the booking SDK's Stripe webhook (see the booking package README).
