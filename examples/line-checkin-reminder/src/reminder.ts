/**
 * Daily LINE check-in reminder.
 *
 * Fetches tomorrow's confirmed arrivals from Beds24 and pushes a check-in
 * reminder to your LINE group. Run it from a cron / scheduled job once a day.
 *
 *   npx tsx src/reminder.ts
 */
import { Beds24Client } from "@sleepy-beds/sdk";
import { Beds24LineNotifier, fromBeds24Booking } from "@sleepy-beds/line";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** Today + n days as YYYY-MM-DD (local). */
function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const client = new Beds24Client({ refreshToken: requireEnv("BEDS24_REFRESH_TOKEN") });
  const line = new Beds24LineNotifier({
    channelAccessToken: requireEnv("LINE_CHANNEL_ACCESS_TOKEN"),
    to: requireEnv("LINE_GROUP_ID"),
  });

  const tomorrow = isoDatePlus(1);
  const arrivals = await client.getBookings({
    arrivalFrom: tomorrow,
    arrivalTo: tomorrow,
    status: "confirmed",
  });

  console.log(`📅 ${tomorrow}: ${arrivals.length} arrival(s)`);

  for (const booking of arrivals) {
    const summary = fromBeds24Booking(booking, { propertyName: process.env.PROPERTY_NAME });
    await line.notifyCheckinReminder(summary);
    console.log(`  🔔 reminded: ${summary.guestName}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
