import { describe, expect, it } from "vitest";
import { calcNights, formatDateJa, fromBeds24Booking, renderMessage } from "../src/templates";
import type { BookingSummary } from "../src/types";

const booking: BookingSummary = {
  id: "BK-001",
  guestName: "John Smith",
  checkIn: "2026-06-12",
  checkOut: "2026-06-14",
  guests: 2,
  totalPrice: 24000,
  phone: "090-1234-5678",
  propertyName: "古民家のらり",
};

describe("formatDateJa", () => {
  it("formats with the Japanese weekday", () => {
    expect(formatDateJa("2026-06-12")).toBe("6/12(金)");
  });
  it("returns the raw value when unparseable", () => {
    expect(formatDateJa("not-a-date")).toBe("not-a-date");
  });
});

describe("calcNights", () => {
  it("counts whole nights", () => {
    expect(calcNights("2026-06-12", "2026-06-14")).toBe(2);
  });
  it("never goes negative", () => {
    expect(calcNights("2026-06-14", "2026-06-12")).toBe(0);
  });
});

describe("renderMessage", () => {
  it("booking_created includes guest, stay, price and phone", () => {
    const [msg] = renderMessage("booking_created", booking);
    expect(msg.type).toBe("text");
    expect(msg.text).toContain("新規予約");
    expect(msg.text).toContain("John Smith 様");
    expect(msg.text).toContain("6/12(金) → 6/14(日) (2泊)");
    expect(msg.text).toContain("¥24,000");
    expect(msg.text).toContain("090-1234-5678");
    expect(msg.text).toContain("古民家のらり");
  });

  it("booking_cancelled omits the price", () => {
    const [msg] = renderMessage("booking_cancelled", booking);
    expect(msg.text).toContain("キャンセル");
    expect(msg.text).not.toContain("¥");
  });

  it("checkin_reminder mentions tomorrow's check-in", () => {
    const [msg] = renderMessage("checkin_reminder", booking);
    expect(msg.text).toContain("明日チェックイン");
    expect(msg.text).toContain("6/12(金) チェックイン");
  });

  it("gracefully omits optional fields", () => {
    const [msg] = renderMessage("booking_created", {
      guestName: "名無し",
      checkIn: "2026-07-01",
      checkOut: "2026-07-02",
    });
    expect(msg.text).not.toContain("💰");
    expect(msg.text).not.toContain("☎️");
    expect(msg.text).toContain("(1泊)");
  });
});

describe("fromBeds24Booking", () => {
  it("maps Beds24 fields and joins the name", () => {
    const summary = fromBeds24Booking(
      {
        id: 9001,
        propertyId: 1,
        roomId: 2,
        status: "confirmed",
        arrival: "2026-06-12",
        departure: "2026-06-14",
        numAdult: 2,
        numChild: 1,
        firstName: "Taro",
        lastName: "Yamada",
        phone: "090",
        price: 30000,
      },
      { propertyName: "Inn", currency: "JPY" },
    );
    expect(summary.guestName).toBe("Taro Yamada");
    expect(summary.guests).toBe(3);
    expect(summary.totalPrice).toBe(30000);
    expect(summary.propertyName).toBe("Inn");
  });

  it("falls back to a default name when none is present", () => {
    const summary = fromBeds24Booking({
      id: 1,
      propertyId: 1,
      roomId: 1,
      status: "new",
      arrival: "2026-06-12",
      departure: "2026-06-13",
    });
    expect(summary.guestName).toBe("ゲスト");
    expect(summary.guests).toBeUndefined();
  });
});
