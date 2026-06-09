# beds24-booking-sdk

Beds24 + Stripe + Resend を統合した宿泊施設予約SDK。

空き状況確認・料金計算・Stripe決済・Beds24予約作成・メール通知をワンストップで提供します。

## インストール

```bash
npm install beds24-booking-sdk stripe resend
```

`stripe` と `resend` は peer dependency です。`resend` はメール送信を使わない場合は省略できます。

## セットアップ

```typescript
import { BookingSDK } from "beds24-booking-sdk";

const sdk = new BookingSDK({
  beds24: {
    refreshToken: process.env.BEDS24_REFRESH_TOKEN!,
    accessToken: process.env.BEDS24_ACCESS_TOKEN, // 省略可（自動リフレッシュ）
    propertyId: 123456,
    roomId: 654321,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY!,
    from: "宿名 <noreply@example.com>",
    owner: "owner@example.com",
    replyTo: "info@example.com", // 省略可
  },
  property: {
    name: "サンプル旅館",
    nameEn: "Sample Ryokan", // 省略可
    maxGuests: 10,
    checkInTime: "15:00",
    checkOutTime: "10:00",
    address: "東京都千代田区...",
    phone: "03-1234-5678",
    basePrice: 15000,
    weekendPrice: 20000,
    extraGuestThreshold: 2, // この人数を超えると追加料金
    extraGuestSurcharge: 3000, // 1人1泊あたりの追加料金
    validCheckInTimes: ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00"],
    maxStayNights: 30,
  },
  baseUrl: "https://example.com",
});
```

## 使い方

### 空き状況の取得

```typescript
// 12ヶ月分のカレンダーを取得（価格キャッシュも自動更新）
const calendar = await sdk.getCalendar("2026-04-01", "2027-03-31");

// 特定の日程の空き確認
const available = await sdk.checkAvailability("2026-05-01", "2026-05-03", 4);
```

### 料金計算

```typescript
// クライアント側：空き状況データから計算
const price = sdk.calculatePrice("2026-05-01", "2026-05-03", availabilityData, 4);

// サーバー側：キャッシュから検証（改ざん防止）
const verified = sdk.verifyPriceFromCache("2026-05-01", "2026-05-03", 4);
```

### Stripe チェックアウト

```typescript
import { isCheckoutError } from "beds24-booking-sdk";

const result = await sdk.createCheckout({
  checkIn: "2026-05-01",
  checkOut: "2026-05-03",
  guestName: "山田 太郎",
  guestNameKana: "ヤマダ タロウ",
  guestEmail: "taro@example.com",
  guestPhone: "090-1234-5678",
  guests: 4,
  totalPrice: 46000,
  checkInTime: "16:00",
  notes: "アレルギーあり",
});

if (isCheckoutError(result)) {
  console.error(result.error); // バリデーションエラー or 価格不一致
} else {
  // result.url に Stripe Checkout のURLが入る
  redirect(result.url);
}
```

### Webhook 処理

Stripe の `checkout.session.completed` イベントを受け取り、Beds24 予約作成 + メール送信を一括実行します。

```typescript
// Next.js API Route の例
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  const result = await sdk.handlePaymentWebhook(body, signature);

  if (result.error) {
    return Response.json({ error: result.error }, { status: 500 });
  }
  return Response.json(result);
}
```

### メールテンプレート単独利用

```typescript
import {
  generateBookingConfirmationEmail,
  generateOwnerNotificationEmail,
} from "beds24-booking-sdk/email";

const guestEmail = generateBookingConfirmationEmail(bookingData, propertyConfig);
const ownerEmail = generateOwnerNotificationEmail(bookingData, propertyConfig);
```

## サブモジュール

必要な部分だけインポートできます。

```typescript
import { Beds24Client } from "beds24-booking-sdk/beds24";
import { PriceCache, calculateTotalPrice } from "beds24-booking-sdk/pricing";
import { EmailSender } from "beds24-booking-sdk/email";
import { validateCheckoutRequest } from "beds24-booking-sdk/payment";
```

## 動作要件

- Node.js >= 18
- Beds24 API V2 アカウント（リフレッシュトークン）
- Stripe アカウント（シークレットキー + Webhook シークレット）
- Resend アカウント（API キー）— メール送信を使う場合

## ライセンス

MIT
