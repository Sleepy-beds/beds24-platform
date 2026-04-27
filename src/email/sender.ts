import { Resend } from "resend";
import type { EmailConfig, SendEmailResult } from "../types";

interface SendSingleEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export class EmailSender {
  private resend: Resend;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.resend = new Resend(config.resendApiKey);
  }

  async send({ to, subject, html, text, replyTo }: SendSingleEmailParams): Promise<boolean> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.config.from,
        to,
        subject,
        html,
        text,
        ...(replyTo ? { replyTo } : {}),
      });
      if (error) {
        console.error("[beds24-booking-sdk] Resend returned an error:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[beds24-booking-sdk] Failed to send email:", err);
      return false;
    }
  }

  async sendBookingEmails(params: {
    guestEmail: string;
    guestSubject: string;
    guestHtml: string;
    guestText: string;
    ownerSubject: string;
    ownerHtml: string;
    ownerText: string;
  }): Promise<SendEmailResult> {
    const guestSent = await this.send({
      to: params.guestEmail,
      subject: params.guestSubject,
      html: params.guestHtml,
      text: params.guestText,
      replyTo: this.config.replyTo || undefined,
    });
    console.log(
      `[beds24-booking-sdk] Guest email ${guestSent ? "sent" : "failed"} (${params.guestEmail})`,
    );

    let ownerSent = false;
    if (this.config.owner) {
      let ownerHtml = params.ownerHtml;
      let ownerText = params.ownerText;
      if (!guestSent) {
        const alert = `<div style="background:#f8d7da;color:#721c24;padding:12px 16px;margin-bottom:16px;border-radius:4px;font-family:sans-serif;font-size:14px;"><strong>⚠ Guest confirmation email failed to send</strong><br/>Recipient: ${params.guestEmail}<br/>Please contact the guest manually.</div>`;
        ownerHtml = alert + ownerHtml;
        ownerText = `⚠ Guest confirmation email failed to send (recipient: ${params.guestEmail}).\nPlease contact the guest manually.\n\n${ownerText}`;
      }

      ownerSent = await this.send({
        to: this.config.owner,
        subject: !guestSent ? `⚠ ${params.ownerSubject}` : params.ownerSubject,
        html: ownerHtml,
        text: ownerText,
      });
      console.log(
        `[beds24-booking-sdk] Owner email ${ownerSent ? "sent" : "failed"} (${this.config.owner})`,
      );
    }

    return { guestSent, ownerSent };
  }
}
