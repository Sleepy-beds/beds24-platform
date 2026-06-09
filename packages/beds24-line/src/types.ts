// ============================================================
// beds24-line — Type Definitions
// LINE Messaging API push notifications for Beds24 booking events.
// (LINE Notify was discontinued in March 2025 — this uses the Messaging API.)
// ============================================================

/** Connection options for {@link Beds24LineNotifier}. */
export interface LineConfig {
  /**
   * LINE Messaging API channel access token.
   * Issue one in the LINE Developers console → your Messaging API channel.
   */
  channelAccessToken: string;
  /**
   * Default push target: a userId, groupId, or roomId.
   * Can be overridden per call. Required if you omit `to` on each `notify`.
   */
  to?: string;
  /**
   * Override the API base URL.
   * @default "https://api.line.me"
   */
  apiBase?: string;
  /**
   * Custom `fetch` implementation (testing / non-global-fetch runtimes).
   * @default globalThis.fetch
   */
  fetch?: typeof fetch;
}

/** Booking lifecycle events that map to a notification template. */
export type LineEvent = "booking_created" | "booking_cancelled" | "checkin_reminder";

/**
 * Normalized booking data used to render a notification.
 * Decoupled from Beds24's wire format — use {@link fromBeds24Booking} to convert.
 */
export interface BookingSummary {
  id?: string | number;
  guestName: string;
  /** Arrival date, YYYY-MM-DD. */
  checkIn: string;
  /** Departure date, YYYY-MM-DD. */
  checkOut: string;
  guests?: number;
  totalPrice?: number;
  phone?: string;
  email?: string;
  propertyName?: string;
  roomName?: string;
  notes?: string;
  /** Number of nights. Computed from checkIn/checkOut when omitted. */
  nights?: number;
  /** Currency for `totalPrice` display. @default "JPY" */
  currency?: string;
}

// --- LINE message shapes (minimal subset) ---

export interface LineTextMessage {
  type: "text";
  text: string;
}

/** Any LINE message object. Text is typed; Flex/other pass through. */
export type LineMessage = LineTextMessage | { type: string; [key: string]: unknown };

export interface NotifyParams {
  event: LineEvent;
  booking: BookingSummary;
  /** Push target override. Falls back to `config.to`. */
  to?: string;
  /** Provide messages directly to bypass the built-in templates. */
  messages?: LineMessage[];
}
