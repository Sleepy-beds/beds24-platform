export function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parse(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

export function todayStr(): string {
  return fmt(new Date());
}

export function nights(checkIn: string, checkOut: string): number {
  return Math.round((parse(checkOut).getTime() - parse(checkIn).getTime()) / 86_400_000);
}

const JP_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function formatJa(s: string): string {
  const d = parse(s);
  return `${d.getMonth() + 1}月${d.getDate()}日(${JP_WEEKDAYS[d.getDay()]})`;
}

export function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export interface MonthGrid {
  year: number;
  month: number; // 0-indexed
  label: string;
  weeks: (string | null)[][]; // 6 weeks x 7 days, null = padding
}

/** Build a Sun–Sat month grid of date strings (null for padding cells). */
export function monthGrid(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(fmt(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return { year, month, label: `${year}年${month + 1}月`, weeks };
}

export const WEEKDAY_LABELS = JP_WEEKDAYS;
