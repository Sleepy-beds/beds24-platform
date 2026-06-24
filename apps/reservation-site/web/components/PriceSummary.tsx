import type { ReactNode } from "react";
import type { PublicProperty, Quote } from "../api";
import { formatJa, yen } from "../lib/date";

interface Props {
  property: PublicProperty;
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  quote: Quote | null;
  quoteError: string | null;
}

export default function PriceSummary({
  property,
  checkIn,
  checkOut,
  guests,
  quote,
  quoteError,
}: Props) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 font-serif text-lg font-semibold">ご予約内容</h3>

      <dl className="space-y-3 text-sm">
        <Row label="チェックイン">
          {checkIn ? `${formatJa(checkIn)} ${property.checkInTime}〜` : "—"}
        </Row>
        <Row label="チェックアウト">
          {checkOut ? `${formatJa(checkOut)} 〜${property.checkOutTime}` : "—"}
        </Row>
        <Row label="人数">{guests}名</Row>
        {quote && <Row label="泊数">{quote.nights}泊</Row>}
      </dl>

      <div className="my-4 border-t border-clay/15" />

      {quoteError ? (
        <p className="text-sm text-red-500">{quoteError}</p>
      ) : quote ? (
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink/70">合計（税込）</span>
          <span className="font-serif text-2xl font-bold text-accent">{yen(quote.total)}</span>
        </div>
      ) : (
        <p className="text-sm text-ink/50">日程を選択すると料金が表示されます</p>
      )}

      {quote && guests > property.extraGuestThreshold && (
        <p className="mt-2 text-xs text-ink/50">
          {property.extraGuestThreshold}名を超える {guests - property.extraGuestThreshold}名分の追加料金（
          {yen(property.extraGuestSurcharge)}/泊）を含みます
        </p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink/60">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
