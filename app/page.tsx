"use client";

import { useState } from "react";
import Calendar from "@/components/Calendar";
import type { WeatherResponse } from "@/lib/types";

const icon = (code: string, size: "" | "@2x" = "@2x") =>
  `https://openweathermap.org/img/wn/${code}${size}.png`;

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${w}）`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(qs: URLSearchParams) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/weather?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "取得に失敗しました。");
      const w = body as WeatherResponse;
      setData(w);
      setSelected(w.today);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return setError("都市名を入力してください。");
    load(new URLSearchParams({ q: query.trim() }));
  }

  function locate() {
    if (!navigator.geolocation) return setError("このブラウザは位置情報に対応していません。");
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        load(
          new URLSearchParams({
            lat: String(pos.coords.latitude),
            lon: String(pos.coords.longitude),
          }),
        ),
      () => {
        setLoading(false);
        setError("現在地を取得できませんでした。位置情報の許可を確認してください。");
      },
    );
  }

  const day = data?.days.find((d) => d.date === selected);
  const isToday = data && day?.date === data.today;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">天気予報</h1>

      <form onSubmit={search} className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="都市名（例: Tokyo, 大阪, Paris）"
          aria-label="都市名"
          className="min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-4 py-2 outline-none focus:border-sky-500 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          検索
        </button>
        <button
          type="button"
          onClick={locate}
          disabled={loading}
          className="rounded-xl border border-sky-600 px-5 py-2 font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-300 dark:hover:bg-sky-950"
        >
          📍 現在地
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}
      {loading && <p className="text-sm opacity-60">読み込み中…</p>}

      {data && day && (
        <div className="grid gap-6 md:grid-cols-[20rem_minmax(0,1fr)] md:items-start">
          <Calendar
            today={data.today}
            available={data.days.map((d) => d.date)}
            selected={selected}
            onSelect={setSelected}
          />

          <section className="min-w-0 rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
            <p className="text-sm opacity-60">
              {data.city}（{data.country}）・{formatDate(day.date)}
              {isToday && "・今日"}
            </p>

            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={icon(isToday ? data.current.icon : day.icon)} alt="" width={80} height={80} />
              <div>
                <p className="text-lg font-medium">
                  {isToday ? data.current.description : day.description}
                </p>
                {isToday && <p className="text-sm opacity-60">現在 {data.current.temp}°C</p>}
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="最高気温" value={`${day.tempMax}°C`} className="text-red-500" />
              <Stat label="最低気温" value={`${day.tempMin}°C`} className="text-blue-500" />
              <Stat label="湿度" value={`${day.humidity}%`} />
              <Stat label="降水確率" value={`${day.pop}%`} />
            </dl>

            <h2 className="mt-6 mb-2 text-sm font-semibold opacity-70">3時間ごとの予報</h2>
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {day.hourly.map((h) => (
                <li
                  key={h.time}
                  className="flex min-w-16 shrink-0 flex-col items-center rounded-xl bg-black/5 px-2 py-2 text-xs dark:bg-white/10"
                >
                  <span className="opacity-60">{h.time}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={icon(h.icon, "")} alt={h.description} width={40} height={40} />
                  <span className="font-medium">{h.temp}°C</span>
                  <span className="text-sky-600 dark:text-sky-300">{h.pop}%</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs opacity-50">
              予報は今日から最大5日先まで（OpenWeatherMap 無料プランの範囲）。選べない日付は無効になっています。
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-xs opacity-60">{label}</dt>
      <dd className={`text-2xl font-semibold ${className}`}>{value}</dd>
    </div>
  );
}
