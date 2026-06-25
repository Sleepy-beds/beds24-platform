import { describe, expect, it, vi } from "vitest";
import { Beds24Client } from "../src/client";
import { Beds24Error } from "../src/errors";

const BASE = "https://beds24.com/api/v2";

/** Build a Response with a JSON body. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * A fetch double that answers the token endpoint automatically and serves
 * queued responses for everything else (FIFO), falling back to a default.
 */
function mockFetch(opts: {
  token?: Response;
  queue?: Response[];
  default?: Response;
}) {
  const queue = [...(opts.queue ?? [])];
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.includes("/authentication/token")) {
      return opts.token ?? json({ token: "test-token", expiresIn: 3600 });
    }
    return queue.shift() ?? opts.default ?? json({ data: [] });
  });
  return Object.assign(fn, { calls });
}

function makeClient(fetchImpl: typeof fetch) {
  return new Beds24Client({ refreshToken: "refresh-xyz", fetch: fetchImpl });
}

describe("constructor", () => {
  it("throws AUTH_ERROR when no credentials are given", () => {
    expect(() => new Beds24Client({})).toThrowError(Beds24Error);
    try {
      new Beds24Client({});
    } catch (err) {
      expect((err as Beds24Error).code).toBe("AUTH_ERROR");
    }
  });

  it("accepts an accessToken without a refreshToken", () => {
    expect(() => new Beds24Client({ accessToken: "at" })).not.toThrow();
  });
});

describe("authentication", () => {
  it("exchanges the refresh token for an access token and sends it as the `token` header", async () => {
    const f = mockFetch({ queue: [json({ data: [] })] });
    const client = makeClient(f as unknown as typeof fetch);
    await client.getProperties();

    const tokenCall = f.calls.find((c) => c.url.includes("/authentication/token"));
    expect(tokenCall?.init?.headers).toMatchObject({ refreshToken: "refresh-xyz" });

    const dataCall = f.calls.find((c) => c.url.includes("/properties"));
    expect((dataCall?.init?.headers as Record<string, string>).token).toBe("test-token");
  });

  it("prefers a directly supplied access token and skips the refresh call", async () => {
    const f = mockFetch({ queue: [json({ data: [] })] });
    const client = new Beds24Client({ accessToken: "direct-token", fetch: f as unknown as typeof fetch });
    await client.getProperties();
    expect(f.calls.some((c) => c.url.includes("/authentication/token"))).toBe(false);
    const dataCall = f.calls.find((c) => c.url.includes("/properties"));
    expect((dataCall?.init?.headers as Record<string, string>).token).toBe("direct-token");
  });

  it("refreshes and retries once on a 401", async () => {
    const f = mockFetch({ queue: [json({ error: "expired" }, 401), json({ data: [{ propertyId: 1 }] })] });
    const client = makeClient(f as unknown as typeof fetch);
    const props = await client.getProperties();
    expect(props).toHaveLength(1);
    // token endpoint hit twice (initial + forced refresh), data endpoint hit twice
    expect(f.calls.filter((c) => c.url.includes("/authentication/token"))).toHaveLength(2);
    expect(f.calls.filter((c) => c.url.includes("/properties"))).toHaveLength(2);
  });

  it("maps a failed token refresh to AUTH_ERROR", async () => {
    const f = mockFetch({ token: json({ error: "bad refresh" }, 403) });
    const client = makeClient(f as unknown as typeof fetch);
    await expect(client.getProperties()).rejects.toMatchObject({ code: "AUTH_ERROR" });
  });
});

describe("requests", () => {
  it("getProperties unwraps the `data` envelope", async () => {
    const f = mockFetch({ queue: [json({ data: [{ propertyId: 7, name: "Inn", rooms: [] }] })] });
    const props = await makeClient(f as unknown as typeof fetch).getProperties();
    expect(props).toEqual([{ propertyId: 7, name: "Inn", rooms: [] }]);
  });

  it("getCalendar builds the expected query string", async () => {
    const f = mockFetch({ queue: [json({ data: [] })] });
    await makeClient(f as unknown as typeof fetch).getCalendar("2026-06-01", "2026-06-30", 123);
    const call = f.calls.find((c) => c.url.includes("/inventory/rooms/calendar"));
    expect(call?.url).toContain("startDate=2026-06-01");
    expect(call?.url).toContain("endDate=2026-06-30");
    expect(call?.url).toContain("propertyId=123");
    expect(call?.url).toContain("includePrices=true");
  });

  it("getCalendar also accepts a params object", async () => {
    const f = mockFetch({ queue: [json({ data: [] })] });
    await makeClient(f as unknown as typeof fetch).getCalendar({
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      roomId: 99,
    });
    const call = f.calls.find((c) => c.url.includes("/inventory/rooms/calendar"));
    expect(call?.url).toContain("roomId=99");
  });

  it("getOffers passes numAdults and numChildren", async () => {
    const f = mockFetch({ queue: [json([{ roomId: 1, available: true }])] });
    const offers = await makeClient(f as unknown as typeof fetch).getOffers({
      arrival: "2026-08-01",
      departure: "2026-08-03",
      numAdults: 2,
      numChildren: 1,
    });
    expect(offers).toHaveLength(1);
    const call = f.calls.find((c) => c.url.includes("/inventory/rooms/offers"));
    expect(call?.url).toContain("numAdults=2");
    expect(call?.url).toContain("numChildren=1");
  });

  it("getBookings unwraps the paginated envelope", async () => {
    const f = mockFetch({
      queue: [json({ success: true, count: 1, data: [{ id: 555, status: "confirmed" }] })],
    });
    const bookings = await makeClient(f as unknown as typeof fetch).getBookings({ propertyId: 1 });
    expect(bookings).toEqual([{ id: 555, status: "confirmed" }]);
  });

  it("getBookings tolerates a bare array response", async () => {
    const f = mockFetch({ queue: [json([{ id: 1 }, { id: 2 }])] });
    const bookings = await makeClient(f as unknown as typeof fetch).getBookings();
    expect(bookings).toHaveLength(2);
  });

  it("getBookings serializes array filters as repeated params", async () => {
    const f = mockFetch({ queue: [json({ success: true, data: [] })] });
    await makeClient(f as unknown as typeof fetch).getBookings({ status: ["confirmed", "new"] });
    const call = f.calls.find((c) => c.url.includes("/bookings"));
    expect(call?.url).toContain("status=confirmed");
    expect(call?.url).toContain("status=new");
  });
});

describe("createBooking", () => {
  it("POSTs the booking wrapped in an array", async () => {
    const f = mockFetch({ queue: [json({ success: true, new: [9001] })] });
    const res = await makeClient(f as unknown as typeof fetch).createBooking({
      roomId: 1,
      arrival: "2026-09-01",
      departure: "2026-09-02",
      numAdult: 2,
      firstName: "Taro",
      lastName: "Yamada",
      email: "t@example.com",
      phone: "090",
    });
    expect(res.new).toEqual([9001]);
    const call = f.calls.find((c) => c.url.endsWith("/bookings"));
    expect(call?.init?.method).toBe("POST");
    expect(JSON.parse(String(call?.init?.body))).toHaveLength(1);
  });

  it("throws VALIDATION_ERROR when Beds24 reports success:false", async () => {
    const f = mockFetch({ queue: [json({ success: false, errors: ["room not available"] })] });
    await expect(
      makeClient(f as unknown as typeof fetch).createBooking({
        roomId: 1,
        arrival: "2026-09-01",
        departure: "2026-09-02",
        numAdult: 2,
        firstName: "A",
        lastName: "B",
        email: "a@b.c",
        phone: "1",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("getBooking / modifyBooking / cancelBooking", () => {
  it("getBooking filters by id and returns the first match", async () => {
    const f = mockFetch({ queue: [json({ success: true, data: [{ id: 42, status: "confirmed" }] })] });
    const booking = await makeClient(f as unknown as typeof fetch).getBooking(42);
    expect(booking).toMatchObject({ id: 42 });
    const call = f.calls.find((c) => c.url.includes("/bookings"));
    expect(call?.url).toContain("id=42");
  });

  it("getBooking returns null when nothing matches", async () => {
    const f = mockFetch({ queue: [json({ success: true, data: [] })] });
    const booking = await makeClient(f as unknown as typeof fetch).getBooking(999);
    expect(booking).toBeNull();
  });

  it("modifyBooking POSTs the id with the changed fields", async () => {
    const f = mockFetch({ queue: [json({ success: true, modified: [42] })] });
    const res = await makeClient(f as unknown as typeof fetch).modifyBooking(42, { price: 19800 });
    expect(res.modified).toEqual([42]);
    const call = f.calls.find((c) => c.url.endsWith("/bookings") && c.init?.method === "POST");
    const body = JSON.parse(String(call?.init?.body));
    expect(body).toEqual([{ id: 42, price: 19800 }]);
  });

  it("cancelBooking sets status to cancelled", async () => {
    const f = mockFetch({ queue: [json({ success: true, modified: [42] })] });
    await makeClient(f as unknown as typeof fetch).cancelBooking(42);
    const call = f.calls.find((c) => c.url.endsWith("/bookings") && c.init?.method === "POST");
    expect(JSON.parse(String(call?.init?.body))).toEqual([{ id: 42, status: "cancelled" }]);
  });

  it("modifyBooking throws VALIDATION_ERROR on success:false", async () => {
    const f = mockFetch({ queue: [json({ success: false, errors: ["not found"] })] });
    await expect(
      makeClient(f as unknown as typeof fetch).cancelBooking(7),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("error mapping", () => {
  it.each([
    [404, "NOT_FOUND"],
    [429, "RATE_LIMIT"],
    [400, "VALIDATION_ERROR"],
    [500, "API_ERROR"],
  ])("maps HTTP %i to %s", async (status, code) => {
    const f = mockFetch({ queue: [json({ error: "x" }, status as number)] });
    await expect(makeClient(f as unknown as typeof fetch).getProperties()).rejects.toMatchObject({
      code,
      status,
    });
  });

  it("wraps fetch exceptions as NETWORK_ERROR", async () => {
    const f = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/authentication/token")) {
        return json({ token: "t", expiresIn: 3600 });
      }
      throw new TypeError("connection refused");
    });
    const client = makeClient(f as unknown as typeof fetch);
    await expect(client.getProperties()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("maps non-JSON bodies to PARSE_ERROR", async () => {
    const f = mockFetch({ queue: [new Response("<html>503</html>", { status: 200 })] });
    await expect(makeClient(f as unknown as typeof fetch).getProperties()).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });
});
