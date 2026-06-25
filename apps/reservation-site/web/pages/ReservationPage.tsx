import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createCheckout,
  getCalendar,
  getProperty,
  getQuote,
  type DayInfo,
  type PublicProperty,
  type Quote,
} from "../api";
import Calendar from "../components/Calendar";
import GuestForm, { type GuestFields } from "../components/GuestForm";
import PriceSummary from "../components/PriceSummary";
import { fmt, formatJa } from "../lib/date";

export default function ReservationPage() {
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [mode, setMode] = useState<"live" | "mock">("mock");

  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [dayMap, setDayMap] = useState<Record<string, DayInfo>>({});
  const [calLoading, setCalLoading] = useState(false);

  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [guest, setGuest] = useState<GuestFields>({
    guestName: "",
    guestNameKana: "",
    guestEmail: "",
    guestPhone: "",
    checkInTime: "15:00",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load property config once.
  useEffect(() => {
    getProperty()
      .then(({ property, mode }) => {
        setProperty(property);
        setMode(mode);
        setGuest((g) => ({ ...g, checkInTime: property.validCheckInTimes[0] ?? g.checkInTime }));
      })
      .catch(() => setSubmitError("施設情報の読み込みに失敗しました"));
  }, []);

  // Fetch calendar for the visible month.
  useEffect(() => {
    const start = fmt(new Date(view.year, view.month, 1));
    const end = fmt(new Date(view.year, view.month + 1, 0));
    setCalLoading(true);
    getCalendar(start, end)
      .then((days) =>
        setDayMap((prev) => {
          const next = { ...prev };
          for (const d of days) next[d.date] = d;
          return next;
        }),
      )
      .catch(() => {})
      .finally(() => setCalLoading(false));
  }, [view.year, view.month]);

  // Recompute the quote whenever the stay changes.
  useEffect(() => {
    if (!checkIn || !checkOut) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    getQuote(checkIn, checkOut, guests)
      .then((q) => !cancelled && (setQuote(q), setQuoteError(null)))
      .catch((e) => !cancelled && (setQuote(null), setQuoteError(e instanceof ApiError ? e.message : "料金計算に失敗しました")));
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, guests]);

  const onPick = (date: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
    } else if (date > checkIn) {
      setCheckOut(date);
    } else {
      setCheckIn(date);
    }
  };

  const canSubmit = useMemo(
    () =>
      !!quote &&
      !quoteError &&
      guest.guestName.trim() !== "" &&
      /.+@.+\..+/.test(guest.guestEmail) &&
      guest.guestPhone.trim() !== "" &&
      !submitting,
    [quote, quoteError, guest, submitting],
  );

  const handleSubmit = async () => {
    if (!checkIn || !checkOut || !quote) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { url } = await createCheckout({
        checkIn,
        checkOut,
        guests,
        guestName: guest.guestName.trim(),
        guestNameKana: guest.guestNameKana.trim(),
        guestEmail: guest.guestEmail.trim(),
        guestPhone: guest.guestPhone.trim(),
        checkInTime: guest.checkInTime,
        notes: guest.notes.trim(),
        totalPrice: quote.total,
      });
      window.location.href = url; // Stripe Checkout (live) or success page (mock)
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "予約処理に失敗しました");
      setSubmitting(false);
    }
  };

  if (!property) {
    return <div className="grid min-h-screen place-items-center text-clay">読み込み中…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-clay/15 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="font-serif text-xl font-bold tracking-wide">{property.name}</h1>
            {property.nameEn && <p className="text-xs text-clay">{property.nameEn}</p>}
          </div>
          {mode === "mock" && (
            <span className="rounded-full bg-moss/10 px-3 py-1 text-xs text-moss">DEMO（モックデータ）</span>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">1. 日程を選ぶ</h2>
            <Calendar
              year={view.year}
              month={view.month}
              dayMap={dayMap}
              checkIn={checkIn}
              checkOut={checkOut}
              loading={calLoading}
              onMonthChange={(year, month) => setView({ year, month })}
              onPick={onPick}
            />
            {checkIn && (
              <p className="mt-3 text-sm text-ink/70">
                {formatJa(checkIn)}
                {checkOut ? ` 〜 ${formatJa(checkOut)}` : "（チェックアウト日を選択してください）"}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">2. ご利用人数</h2>
            <div className="card flex items-center gap-4 p-4">
              <label className="label mb-0">人数</label>
              <select
                className="field max-w-32"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
              >
                {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}名
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink/50">最大 {property.maxGuests}名</span>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">3. お客様情報</h2>
            <div className="card p-5">
              <GuestForm property={property} value={guest} onChange={setGuest} />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:h-fit">
          <PriceSummary
            property={property}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            quote={quote}
            quoteError={quoteError}
          />
          <button className="btn-primary mt-4 w-full" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? "処理中…" : mode === "mock" ? "予約を確定する（デモ）" : "お支払いへ進む"}
          </button>
          {submitError && <p className="mt-2 text-sm text-red-500">{submitError}</p>}
          <p className="mt-3 text-center text-xs text-ink/40">
            {property.phone} / {property.address}
          </p>
        </aside>
      </main>
    </div>
  );
}
