import type { DayInfo } from "../api";
import { monthGrid, todayStr, WEEKDAY_LABELS } from "../lib/date";

interface Props {
  year: number;
  month: number;
  dayMap: Record<string, DayInfo>;
  checkIn: string | null;
  checkOut: string | null;
  loading?: boolean;
  onMonthChange: (year: number, month: number) => void;
  onPick: (date: string) => void;
}

export default function Calendar({
  year,
  month,
  dayMap,
  checkIn,
  checkOut,
  loading,
  onMonthChange,
  onPick,
}: Props) {
  const grid = monthGrid(year, month);
  const today = todayStr();
  const thisMonth = new Date();
  const atCurrentMonth = year === thisMonth.getFullYear() && month === thisMonth.getMonth();

  const step = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={atCurrentMonth}
          className="rounded-full px-3 py-1 text-lg text-clay transition hover:bg-sand disabled:opacity-30"
          aria-label="前の月"
        >
          ‹
        </button>
        <div className="font-serif text-lg font-semibold">
          {grid.label}
          {loading && <span className="ml-2 text-xs font-normal text-clay">読み込み中…</span>}
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          className="rounded-full px-3 py-1 text-lg text-clay transition hover:bg-sand"
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs text-ink/50">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={w} className={i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.weeks.flat().map((date, idx) => {
          if (!date) return <div key={`pad-${idx}`} />;
          const info = dayMap[date];
          const isPast = date < today;
          const soldOut = info ? !info.available : true;
          const disabled = isPast || soldOut;
          const isStart = date === checkIn;
          const isEnd = date === checkOut;
          const inRange = !!checkIn && !!checkOut && date > checkIn && date < checkOut;
          const selected = isStart || isEnd;

          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onPick(date)}
              className={[
                "flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition",
                selected ? "bg-accent text-white" : "",
                inRange ? "bg-accent/15" : "",
                !selected && !inRange && !disabled ? "hover:bg-sand" : "",
                disabled ? "cursor-not-allowed text-ink/25 line-through" : "text-ink",
              ].join(" ")}
            >
              <span className="leading-none">{Number(date.slice(8))}</span>
              {info && info.available && !isPast && (
                <span className={`mt-0.5 text-[9px] leading-none ${selected ? "text-white/80" : "text-clay"}`}>
                  {Math.round(info.price / 1000)}k
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-ink/50">
        日付を2回タップしてチェックイン・チェックアウトを選択
      </p>
    </div>
  );
}
