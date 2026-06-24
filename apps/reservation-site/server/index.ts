import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { env, isLive, publicProperty } from "./config.js";
import { isServiceError, type BookingService } from "./service.js";
import { MockBookingService } from "./mock.js";

const isProd = process.env.NODE_ENV === "production";

// Pick the implementation. The live one is imported lazily so the mock path has
// zero dependency on Stripe/Beds24 config being valid.
async function makeService(): Promise<BookingService> {
  if (!isLive) return new MockBookingService();
  const { LiveBookingService } = await import("./live.js");
  return new LiveBookingService();
}

const service = await makeService();

const app = new Hono();
app.use("*", logger());
app.use("/api/*", cors());

// --- API ---

app.get("/api/health", (c) => c.json({ ok: true, mode: service.mode }));

app.get("/api/property", (c) => c.json({ property: publicProperty(), mode: service.mode }));

app.get("/api/calendar", async (c) => {
  const start = c.req.query("start");
  const end = c.req.query("end");
  if (!start || !end) return c.json({ error: "start と end は必須です" }, 400);
  try {
    return c.json({ days: await service.getCalendar(start, end) });
  } catch (err) {
    console.error("calendar error:", err);
    return c.json({ error: "カレンダーの取得に失敗しました" }, 502);
  }
});

app.get("/api/quote", async (c) => {
  const checkIn = c.req.query("checkIn");
  const checkOut = c.req.query("checkOut");
  const guests = Number(c.req.query("guests") ?? "2");
  if (!checkIn || !checkOut) return c.json({ error: "checkIn と checkOut は必須です" }, 400);
  const result = await service.quote(checkIn, checkOut, guests);
  if (isServiceError(result)) return c.json({ error: result.error }, result.status as 400);
  return c.json(result);
});

app.post("/api/checkout", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "不正なリクエストです" }, 400);
  }
  const result = await service.createCheckout({
    checkIn: String(body.checkIn ?? ""),
    checkOut: String(body.checkOut ?? ""),
    guests: Number(body.guests ?? 0),
    guestName: String(body.guestName ?? ""),
    guestNameKana: String(body.guestNameKana ?? ""),
    guestEmail: String(body.guestEmail ?? ""),
    guestPhone: String(body.guestPhone ?? ""),
    checkInTime: body.checkInTime ? String(body.checkInTime) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    totalPrice: Number(body.totalPrice ?? 0),
  });
  if (isServiceError(result)) return c.json({ error: result.error }, result.status as 400);
  return c.json(result);
});

app.get("/api/reservation/:sessionId", async (c) => {
  const reservation = await service.getReservation(c.req.param("sessionId"));
  if (!reservation) return c.json({ error: "予約が見つかりません" }, 404);
  return c.json({ reservation });
});

app.post("/api/webhook/stripe", async (c) => {
  const signature = c.req.header("stripe-signature") ?? "";
  const raw = await c.req.text();
  const { status, body } = await service.handleWebhook(raw, signature);
  return c.json(body as object, status as 200);
});

// --- Static SPA (production only; in dev Vite serves the frontend) ---

if (isProd) {
  app.use("/assets/*", serveStatic({ root: "./dist/client" }));
  app.use("/favicon.ico", serveStatic({ path: "./dist/client/favicon.ico" }));
  const indexHtml = readFileSync(join(process.cwd(), "dist/client/index.html"), "utf-8");
  app.get("*", (c) => c.html(indexHtml));
}

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`\n  reservation-site  [${service.mode.toUpperCase()} mode]`);
  console.log(`  API  http://localhost:${info.port}`);
  if (!isProd) console.log(`  Web  http://localhost:5173  (vite dev)\n`);
  if (service.mode === "mock") {
    console.log("  ※ Beds24/Stripe 未設定のためモックデータで動作中。.env を設定すると実APIに切替わります。\n");
  }
});
