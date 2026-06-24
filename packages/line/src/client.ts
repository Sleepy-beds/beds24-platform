import { LineError } from "./errors";
import { renderMessage } from "./templates";
import type { BookingSummary, LineConfig, LineMessage, NotifyParams } from "./types";

const DEFAULT_API_BASE = "https://api.line.me";

/**
 * Sends Beds24 booking notifications to LINE via the Messaging API push endpoint.
 *
 * @example
 * ```ts
 * const line = new Beds24LineNotifier({
 *   channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
 *   to: process.env.LINE_GROUP_ID,
 * });
 * await line.notify({ event: "booking_created", booking });
 * ```
 */
export class Beds24LineNotifier {
  private readonly config: LineConfig;
  private readonly apiBase: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: LineConfig) {
    if (!config.channelAccessToken) {
      throw new LineError({
        code: "CONFIG_ERROR",
        message:
          "Beds24LineNotifier requires a `channelAccessToken` from the LINE Developers console.",
      });
    }
    this.config = config;
    this.apiBase = (config.apiBase ?? DEFAULT_API_BASE).replace(/\/$/, "");
    const f = config.fetch ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new LineError({
        code: "CONFIG_ERROR",
        message: "No `fetch` implementation available. Provide `config.fetch` or run on Node 18+.",
      });
    }
    this.fetchImpl = f;
  }

  /** Render and push a notification for a booking event. */
  async notify(params: NotifyParams): Promise<void> {
    const to = params.to ?? this.config.to;
    if (!to) {
      throw new LineError({
        code: "CONFIG_ERROR",
        message: "No push target. Set `config.to` or pass `to` to notify().",
      });
    }
    const messages = params.messages ?? renderMessage(params.event, params.booking);
    await this.push(to, messages);
  }

  notifyBookingCreated(booking: BookingSummary, to?: string): Promise<void> {
    return this.notify({ event: "booking_created", booking, to });
  }

  notifyBookingCancelled(booking: BookingSummary, to?: string): Promise<void> {
    return this.notify({ event: "booking_cancelled", booking, to });
  }

  notifyCheckinReminder(booking: BookingSummary, to?: string): Promise<void> {
    return this.notify({ event: "checkin_reminder", booking, to });
  }

  /** Low-level push: send raw LINE message objects to a target. */
  async push(to: string, messages: LineMessage[]): Promise<void> {
    if (messages.length === 0) return;
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.apiBase}/v2/bot/message/push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.channelAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, messages }),
      });
    } catch (cause) {
      throw new LineError({
        code: "NETWORK_ERROR",
        message: "Network error calling the LINE Messaging API.",
        cause,
      });
    }

    if (!res.ok) {
      throw new LineError({
        code: "API_ERROR",
        message: `LINE push failed (${res.status}).`,
        status: res.status,
        body: await safeBody(res),
      });
    }
  }
}

async function safeBody(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}
