import type { PublicProperty } from "../api";

export interface GuestFields {
  guestName: string;
  guestNameKana: string;
  guestEmail: string;
  guestPhone: string;
  checkInTime: string;
  notes: string;
}

interface Props {
  property: PublicProperty;
  value: GuestFields;
  onChange: (next: GuestFields) => void;
}

export default function GuestForm({ property, value, onChange }: Props) {
  const set = <K extends keyof GuestFields>(key: K, v: GuestFields[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">お名前 *</label>
        <input
          className="field"
          value={value.guestName}
          onChange={(e) => set("guestName", e.target.value)}
          placeholder="山田 太郎"
          autoComplete="name"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label">フリガナ</label>
        <input
          className="field"
          value={value.guestNameKana}
          onChange={(e) => set("guestNameKana", e.target.value)}
          placeholder="ヤマダ タロウ"
        />
      </div>
      <div>
        <label className="label">メールアドレス *</label>
        <input
          className="field"
          type="email"
          value={value.guestEmail}
          onChange={(e) => set("guestEmail", e.target.value)}
          placeholder="taro@example.com"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="label">電話番号 *</label>
        <input
          className="field"
          type="tel"
          value={value.guestPhone}
          onChange={(e) => set("guestPhone", e.target.value)}
          placeholder="090-1234-5678"
          autoComplete="tel"
        />
      </div>
      <div>
        <label className="label">チェックイン予定時刻</label>
        <select
          className="field"
          value={value.checkInTime}
          onChange={(e) => set("checkInTime", e.target.value)}
        >
          {property.validCheckInTimes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label">ご要望（任意）</label>
        <textarea
          className="field min-h-20"
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="アレルギー、到着が遅れる等あればご記入ください"
        />
      </div>
    </div>
  );
}
