import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getReservation, type Reservation } from "../api";
import { formatJa, yen } from "../lib/date";

export default function SuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("セッションIDがありません");
      return;
    }
    getReservation(sessionId)
      .then(setReservation)
      .catch(() => setError("予約情報を取得できませんでした。確認メールをご確認ください。"));
  }, [sessionId]);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-moss/15 text-3xl text-moss">
          ✓
        </div>
        <h1 className="font-serif text-2xl font-bold">ご予約ありがとうございます</h1>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        {reservation && (
          <>
            <p className="mt-2 text-sm text-ink/60">
              {reservation.status === "paid"
                ? "お支払いが完了し、予約が確定しました。"
                : "予約を受け付けました。確認メールをお送りします。"}
            </p>

            <dl className="mx-auto mt-6 space-y-3 text-left text-sm">
              {reservation.bookingId && (
                <Row label="予約番号">{reservation.bookingId}</Row>
              )}
              <Row label="お名前">{reservation.guestName} 様</Row>
              <Row label="チェックイン">{formatJa(reservation.checkIn)}</Row>
              <Row label="チェックアウト">{formatJa(reservation.checkOut)}</Row>
              <Row label="人数">{reservation.guests}名</Row>
              <Row label="泊数">{reservation.nights}泊</Row>
              <div className="flex justify-between border-t border-clay/15 pt-3">
                <dt className="text-ink/60">お支払い金額</dt>
                <dd className="font-serif text-lg font-bold text-accent">{yen(reservation.totalPrice)}</dd>
              </div>
            </dl>
          </>
        )}

        {!reservation && !error && <p className="mt-4 text-sm text-ink/50">確認中…</p>}

        <Link to="/reservation" className="btn-primary mt-8">
          トップに戻る
        </Link>
      </div>
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
