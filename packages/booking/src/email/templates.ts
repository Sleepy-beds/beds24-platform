import type { BookingEmailData, EmailContent, PropertyConfig } from "../types";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function generateBookingConfirmationEmail(
  data: BookingEmailData,
  property: Pick<PropertyConfig, "name" | "nameEn" | "checkInTime" | "checkOutTime" | "address" | "phone">,
): EmailContent {
  const checkInFormatted = data.checkIn.replace(/-/g, "/");
  const checkOutFormatted = data.checkOut.replace(/-/g, "/");
  const guestName = escapeHtml(data.guestName);
  const guestNameKana = escapeHtml(data.guestNameKana);
  const guestEmail = escapeHtml(data.guestEmail);
  const guestPhone = escapeHtml(data.guestPhone);
  const notes = escapeHtml(data.notes);

  const subject = `【${property.name}】ご予約確認 (${checkInFormatted}〜${checkOutFormatted})`;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1510;font-family:'Noto Serif JP','Hiragino Mincho ProN',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1510;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="text-align:center;padding:32px 0 24px;">
              <p style="font-size:24px;color:#faf7f3;margin:0;letter-spacing:4px;">${escapeHtml(property.name)}</p>
              ${property.nameEn ? `<p style="font-size:10px;color:rgba(196,168,124,0.6);margin:8px 0 0;letter-spacing:3px;text-transform:uppercase;">${escapeHtml(property.nameEn)}</p>` : ""}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 0 32px;">
              <div style="width:48px;height:1px;background-color:rgba(196,168,124,0.4);margin:0 auto;"></div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="background-color:#2c2418;padding:32px 28px;border:1px solid rgba(250,247,243,0.08);">
              <p style="font-size:14px;color:#faf7f3;margin:0 0 16px;letter-spacing:1px;">
                ${guestName} 様
              </p>
              <p style="font-size:12px;color:rgba(250,247,243,0.6);margin:0;line-height:24px;letter-spacing:0.5px;">
                この度は${escapeHtml(property.name)}をご予約いただき、誠にありがとうございます。<br />
                以下の内容でご予約を承りました。
              </p>
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="background-color:#241e14;padding:28px;border:1px solid rgba(250,247,243,0.08);border-top:none;">
              <p style="font-size:10px;color:#c4a87c;margin:0 0 16px;letter-spacing:2px;text-transform:uppercase;">
                Reservation Details
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;color:rgba(250,247,243,0.6);">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);width:120px;letter-spacing:0.5px;">予約番号</td>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);color:#faf7f3;text-align:right;">${data.bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);letter-spacing:0.5px;">チェックイン</td>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);color:#faf7f3;text-align:right;">${checkInFormatted} ${property.checkInTime}〜</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);letter-spacing:0.5px;">チェックアウト</td>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);color:#faf7f3;text-align:right;">${checkOutFormatted} 〜${property.checkOutTime}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);letter-spacing:0.5px;">宿泊数</td>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);color:#faf7f3;text-align:right;">${data.nights}泊</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);letter-spacing:0.5px;">ご利用人数</td>
                  <td style="padding:8px 0;border-bottom:1px solid rgba(250,247,243,0.06);color:#faf7f3;text-align:right;">${data.guests}名</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;letter-spacing:0.5px;">合計金額（税込）</td>
                  <td style="padding:12px 0 0;color:#c4a87c;text-align:right;font-size:16px;">&yen;${data.totalPrice.toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Guest Info -->
          <tr>
            <td style="background-color:#2c2418;padding:28px;border:1px solid rgba(250,247,243,0.08);border-top:none;">
              <p style="font-size:10px;color:#c4a87c;margin:0 0 16px;letter-spacing:2px;text-transform:uppercase;">
                Guest Information
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;color:rgba(250,247,243,0.6);">
                <tr>
                  <td style="padding:6px 0;width:120px;letter-spacing:0.5px;">お名前</td>
                  <td style="padding:6px 0;color:#faf7f3;text-align:right;">${guestName}${guestNameKana ? ` (${guestNameKana})` : ""}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;letter-spacing:0.5px;">メール</td>
                  <td style="padding:6px 0;color:#faf7f3;text-align:right;">${guestEmail}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;letter-spacing:0.5px;">電話番号</td>
                  <td style="padding:6px 0;color:#faf7f3;text-align:right;">${guestPhone}</td>
                </tr>
                ${
                  data.notes
                    ? `<tr>
                  <td style="padding:6px 0;letter-spacing:0.5px;vertical-align:top;">備考</td>
                  <td style="padding:6px 0;color:#faf7f3;text-align:right;">${notes}</td>
                </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>

          <!-- Notes -->
          <tr>
            <td style="background-color:#241e14;padding:24px 28px;border:1px solid rgba(250,247,243,0.08);border-top:none;">
              <p style="font-size:11px;color:rgba(250,247,243,0.5);margin:0;line-height:22px;letter-spacing:0.5px;">
                ご不明な点やご要望がございましたら、お気軽にご連絡ください。<br />
                当日お会いできることを楽しみにしております。
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align:center;padding:32px 0;">
              <div style="width:48px;height:1px;background-color:rgba(196,168,124,0.3);margin:0 auto 24px;"></div>
              <p style="font-size:12px;color:#faf7f3;margin:0 0 4px;letter-spacing:2px;">${escapeHtml(property.name)}</p>
              <p style="font-size:10px;color:rgba(250,247,243,0.4);margin:0 0 4px;letter-spacing:0.5px;">
                ${escapeHtml(property.address)}
              </p>
              <p style="font-size:10px;color:rgba(250,247,243,0.4);margin:0 0 16px;letter-spacing:0.5px;">
                TEL: ${escapeHtml(property.phone)}
              </p>
              <p style="font-size:9px;color:rgba(250,247,243,0.25);margin:0;letter-spacing:0.5px;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(property.name)} All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = `【${property.name}】ご予約確認

${data.guestName} 様

この度は${property.name}をご予約いただき、誠にありがとうございます。
以下の内容でご予約を承りました。

━━━━━━━━━━━━━━━━━━━━
ご予約内容
━━━━━━━━━━━━━━━━━━━━
予約番号: ${data.bookingId}
チェックイン: ${checkInFormatted} ${property.checkInTime}〜
チェックアウト: ${checkOutFormatted} 〜${property.checkOutTime}
宿泊数: ${data.nights}泊
ご利用人数: ${data.guests}名
合計金額（税込）: ¥${data.totalPrice.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━
お客様情報
━━━━━━━━━━━━━━━━━━━━
お名前: ${data.guestName}${data.guestNameKana ? ` (${data.guestNameKana})` : ""}
メール: ${data.guestEmail}
電話番号: ${data.guestPhone}${data.notes ? `\n備考: ${data.notes}` : ""}

━━━━━━━━━━━━━━━━━━━━

ご不明な点やご要望がございましたら、
お気軽にご連絡ください。
当日お会いできることを楽しみにしております。

──────────────
${property.name}
${property.address}
TEL: ${property.phone}
──────────────`;

  return { subject, html, text };
}

export function generateOwnerNotificationEmail(
  data: BookingEmailData,
  property: Pick<PropertyConfig, "name" | "checkInTime" | "checkOutTime">,
): EmailContent {
  const checkInFormatted = data.checkIn.replace(/-/g, "/");
  const checkOutFormatted = data.checkOut.replace(/-/g, "/");

  const subject = `【新規予約】${data.guestName}様 ${checkInFormatted}〜${checkOutFormatted} (${data.bookingId})`;

  const text = `新規予約が入りました。

予約番号: ${data.bookingId}
チェックイン: ${checkInFormatted} ${property.checkInTime}〜
チェックアウト: ${checkOutFormatted} 〜${property.checkOutTime}
宿泊数: ${data.nights}泊
ご利用人数: ${data.guests}名
合計金額（税込）: ¥${data.totalPrice.toLocaleString()}

お客様情報:
お名前: ${data.guestName}${data.guestNameKana ? ` (${data.guestNameKana})` : ""}
メール: ${data.guestEmail}
電話番号: ${data.guestPhone}${data.notes ? `\n備考: ${data.notes}` : ""}`;

  return { subject, html: `<pre>${escapeHtml(text)}</pre>`, text };
}
