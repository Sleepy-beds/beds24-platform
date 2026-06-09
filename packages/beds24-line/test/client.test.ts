import { describe, expect, it, vi } from "vitest";
import { Beds24LineNotifier } from "../src/client";
import { LineError } from "../src/errors";
import type { BookingSummary } from "../src/types";

const booking: BookingSummary = {
  guestName: "John Smith",
  checkIn: "2026-06-12",
  checkOut: "2026-06-14",
  guests: 2,
  totalPrice: 24000,
};

function okFetch() {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response("{}", { status: 200 });
  });
  return Object.assign(fn, { calls });
}

describe("constructor", () => {
  it("throws CONFIG_ERROR without a channel access token", () => {
    expect(() => new Beds24LineNotifier({ channelAccessToken: "" })).toThrowError(LineError);
  });
});

describe("notify", () => {
  it("pushes to the configured default target with the rendered message", async () => {
    const f = okFetch();
    const line = new Beds24LineNotifier({
      channelAccessToken: "tok",
      to: "Cgroup123",
      fetch: f as unknown as typeof fetch,
    });
    await line.notify({ event: "booking_created", booking });

    expect(f.calls).toHaveLength(1);
    const call = f.calls[0];
    expect(call.url).toBe("https://api.line.me/v2/bot/message/push");
    expect((call.init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    const body = JSON.parse(String(call.init?.body));
    expect(body.to).toBe("Cgroup123");
    expect(body.messages[0].text).toContain("新規予約");
  });

  it("lets `to` override the default target", async () => {
    const f = okFetch();
    const line = new Beds24LineNotifier({
      channelAccessToken: "tok",
      to: "default",
      fetch: f as unknown as typeof fetch,
    });
    await line.notifyCheckinReminder(booking, "Uoverride");
    expect(JSON.parse(String(f.calls[0].init?.body)).to).toBe("Uoverride");
  });

  it("throws CONFIG_ERROR when no target is available", async () => {
    const f = okFetch();
    const line = new Beds24LineNotifier({ channelAccessToken: "tok", fetch: f as unknown as typeof fetch });
    await expect(line.notify({ event: "booking_created", booking })).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
    expect(f.calls).toHaveLength(0);
  });

  it("allows custom messages to bypass templates", async () => {
    const f = okFetch();
    const line = new Beds24LineNotifier({
      channelAccessToken: "tok",
      to: "g",
      fetch: f as unknown as typeof fetch,
    });
    await line.notify({
      event: "booking_created",
      booking,
      messages: [{ type: "text", text: "custom" }],
    });
    expect(JSON.parse(String(f.calls[0].init?.body)).messages[0].text).toBe("custom");
  });
});

describe("error handling", () => {
  it("maps a non-2xx LINE response to API_ERROR with status and body", async () => {
    const f = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Invalid token" }), { status: 401 }),
    );
    const line = new Beds24LineNotifier({
      channelAccessToken: "bad",
      to: "g",
      fetch: f as unknown as typeof fetch,
    });
    await expect(line.notifyBookingCreated(booking)).rejects.toMatchObject({
      code: "API_ERROR",
      status: 401,
      body: { message: "Invalid token" },
    });
  });

  it("wraps fetch exceptions as NETWORK_ERROR", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("offline");
    });
    const line = new Beds24LineNotifier({
      channelAccessToken: "tok",
      to: "g",
      fetch: f as unknown as typeof fetch,
    });
    await expect(line.notifyBookingCancelled(booking)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("push with no messages is a no-op", async () => {
    const f = okFetch();
    const line = new Beds24LineNotifier({
      channelAccessToken: "tok",
      to: "g",
      fetch: f as unknown as typeof fetch,
    });
    await line.push("g", []);
    expect(f.calls).toHaveLength(0);
  });
});
