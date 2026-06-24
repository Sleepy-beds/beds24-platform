# reservation-site

`@sleepy-beds` プラットフォーム（Beds24 + Stripe + Resend + LINE）を使った**宿泊予約サイトのテンプレート / リファレンス実装**。

> **各サイトの作り方**: このリポジトリを **fork**（または `apps/reservation-site` をコピー）し、`.env` に施設情報とクレデンシャルを入れるだけで1サイトが立ち上がります。
> クライアント固有の情報（施設名・住所・Beds24/Stripeキー等）は **すべて `.env` 側**にあり、このテンプレート本体には一切含まれません。バックエンドのロジック改善は OSS 側に還元し、各サイトは fork で追従できます。

- **バックエンド**: [Hono](https://hono.dev/)（`@hono/node-server`）
- **フロントエンド**: React 18 + Vite + TypeScript + Tailwind CSS
- **予約ロジック**: `@sleepy-beds/booking`（在庫・料金・Stripe Checkout・確認メール）
- **通知（任意）**: `@sleepy-beds/line`（予約成立時に LINE push）

## モード

| | 条件 | 挙動 |
|---|---|---|
| **Mock** | クレデンシャル未設定（デフォルト） | サンプルの在庫・料金で動作。Stripe/Beds24 不要で全フロー確認可 |
| **Live** | `BEDS24_*` + `STRIPE_*` を設定 | 実際の Beds24 在庫・Stripe Checkout・予約作成 |

`.env` を設定するだけで自動的に Live に切り替わります（コード変更不要）。

## セットアップ

モノレポのルートで依存をインストール:

```bash
# リポジトリのルート（beds24-platform）で
pnpm install
```

環境変数（任意。未設定ならモックで動きます）:

```bash
cd apps/reservation-site
cp .env.example .env   # 施設情報・各種キーを編集
```

## 開発

```bash
cd apps/reservation-site
pnpm dev
```

- Web: http://localhost:5173 （Vite。`/api` は Hono にプロキシ）
- API: http://localhost:8787

## ビルド & 本番起動

```bash
pnpm build      # web → dist/client、server → dist/server
pnpm start      # Hono が API と静的ファイルを配信（PORT で待受）
```

本番では Hono 単体が API とビルド済み SPA の両方を配信します。

## API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/api/property` | 施設情報・モード |
| GET | `/api/calendar?start=&end=` | 日別の料金・空室 |
| GET | `/api/quote?checkIn=&checkOut=&guests=` | 合計料金 |
| POST | `/api/checkout` | 決済開始（リダイレクトURLを返す） |
| GET | `/api/reservation/:sessionId` | 予約サマリ（完了画面用） |
| POST | `/api/webhook/stripe` | Stripe Webhook（予約確定・メール・LINE） |

## Live モードの注意

- Stripe Webhook を `https://<your-domain>/api/webhook/stripe` に登録し、`STRIPE_WEBHOOK_SECRET` を設定してください。ローカルは `stripe listen --forward-to localhost:8787/api/webhook/stripe`。
- 予約は Webhook（支払い完了）で Beds24 に作成されます。
- `LINE_CHANNEL_ACCESS_TOKEN` と `LINE_TO` を設定すると、予約成立時に LINE 通知が飛びます。
