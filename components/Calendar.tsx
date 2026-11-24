"use client";

import { useState } from "react";

type Props = {
  today: string; // "YYYY-MM-DD"
  available: string[]; // 選択可能な日付
  selected: string;
  onSelect: (date: string) => void;
};

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function Calendar({ today, available, selected, onSelect }: Props) {
  const enabled = new Set(available);
  const first = available[0] ?? today;
  const last = available[available.length - 1] ?? today;
  const [firstY, firstM] = first.split("-").map(Number);
  const [lastY, lastM] = last.split("-").map(Number);
  const minIdx = firstY * 12 + firstM - 1;
  const maxIdx = lastY * 12 + lastM - 1;

  const [sy, sm] = selected.split("-").map(Number);
  const [viewIdx, setViewIdx] = useState(sy * 12 + sm - 1);
  const idx = Math.min(Math.max(viewIdx, minIdx), maxIdx);
  const year = Math.floor(idx / 12);
  const month = idx % 12;

  const startDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array<null>(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="w-full min-w-0 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="前の月"
          disabled={idx <= minIdx}
          onClick={() => setViewIdx(idx - 1)}
          className="rounded-lg px-3 py-1 text-lg enabled:hover:bg-black/5 disabled:opacity-25 dark:enabled:hover:bg-white/10"
        >
          ‹
        </button>
        <div className="whitespace-nowrap font-semibold">
          {year}年{month + 1}月
        </div>
        <button
          type="button"
          aria-label="次の月"
          disabled={idx >= maxIdx}
          onClick={() => setViewIdx(idx + 1)}
          className="rounded-lg px-3 py-1 text-lg enabled:hover:bg-black/5 disabled:opacity-25 dark:enabled:hover:bg-white/10"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1 text-center text-sm">
        {WEEK.map((w, i) => (
          <div
            key={w}
            className={`py-1 text-xs ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "opacity-60"}`}
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const date = ymd(year, month, d);
          const ok = enabled.has(date);
          const isSel = date === selected;
          return (
            <button
              key={date}
              type="button"
              disabled={!ok}
              aria-pressed={isSel}
              aria-label={`${month + 1}月${d}日${date === today ? "（今日）" : ""}`}
              onClick={() => onSelect(date)}
              className={[
                "aspect-square rounded-lg text-sm transition",
                isSel
                  ? "bg-sky-600 font-semibold text-white"
                  : ok
                    ? "font-medium hover:bg-sky-100 dark:hover:bg-sky-900/40"
                    : "cursor-not-allowed opacity-25",
                date === today && !isSel ? "ring-1 ring-sky-500" : "",
              ].join(" ")}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
