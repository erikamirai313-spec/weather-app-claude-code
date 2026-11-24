"use client";

import { useEffect, useRef, useState } from "react";
import Calendar from "@/components/Calendar";
import HourlyScroller from "@/components/HourlyScroller";
import WeatherIcon from "@/components/WeatherIcon";
import type { WeatherResponse } from "@/lib/types";
import {
  isWalkTime,
  WALK_MAX_POP,
  WALK_MAX_TEMP,
  WALK_MIN_TEMP,
} from "@/lib/walk";

// 夜は 18時〜翌6時
const isNightTime = (time: string) => {
  const h = Number(time.slice(0, 2));
  return h >= 18 || h < 6;
};

type Favorite = { city: string; country: string; lat: number; lon: number };

const FAV_KEY = "weather-favorites";
const MAX_FAVORITES = 5;

// 座標を小数第2位（約1km）に丸めて同一地点を判定する
const favId = (f: { lat: number; lon: number }) =>
  `${f.lat.toFixed(2)},${f.lon.toFixed(2)}`;
const toFavorite = (w: WeatherResponse): Favorite => ({
  city: w.city,
  country: w.country,
  lat: w.lat,
  lon: w.lon,
});

function readFavorites(): Favorite[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (f) =>
          f &&
          typeof f.city === "string" &&
          typeof f.country === "string" &&
          Number.isFinite(f.lat) &&
          Number.isFinite(f.lon),
      )
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

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
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favLoaded, setFavLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // localStorage はブラウザでのみ読めるため、マウント後に読み込む
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(readFavorites());
    setFavLoaded(true);
  }, []);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  function showNotice(message: string) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3000);
  }

  function saveFavorites(next: Favorite[]) {
    setFavorites(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {
      setError(
        "お気に入りを保存できませんでした。ブラウザの設定を確認してください。",
      );
    }
  }

  function toggleFavorite() {
    if (!data) return;
    const current = toFavorite(data);
    if (favorites.some((f) => favId(f) === favId(current))) {
      saveFavorites(favorites.filter((f) => favId(f) !== favId(current)));
      showNotice("お気に入りを解除しました");
    } else if (favorites.length >= MAX_FAVORITES) {
      showNotice(
        `お気に入りは最大${MAX_FAVORITES}件までです。追加するには、登録済みの都市を先に解除してください。`,
      );
    } else {
      saveFavorites([...favorites, current]);
      showNotice("お気に入りに追加しました");
    }
  }

  function loadFavorite(f: Favorite) {
    setQuery(f.city);
    load(
      new URLSearchParams({
        lat: String(f.lat),
        lon: String(f.lon),
        name: f.city,
        country: f.country,
      }),
    );
  }

  async function load(qs: URLSearchParams) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/weather?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "取得に失敗しました。");
      const w = body as WeatherResponse;
      setData(w);
      // 深夜は今日の予報枠が残っていないため、今日がなければ最初の日を選ぶ
      setSelected(
        w.days.some((d) => d.date === w.today)
          ? w.today
          : (w.days[0]?.date ?? w.today),
      );
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
    if (!navigator.geolocation)
      return setError("このブラウザは位置情報に対応していません。");
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
        setError(
          "現在地を取得できませんでした。位置情報の許可を確認してください。",
        );
      },
    );
  }

  const day = data?.days.find((d) => d.date === selected);
  const isFav = !!data && favorites.some((f) => favId(f) === favId(data));
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
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-4 py-2 text-base outline-none focus:border-sky-500 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-xl bg-sky-600 px-5 py-2 text-base font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          検索
        </button>
        <button
          type="button"
          onClick={locate}
          disabled={loading}
          className="min-h-11 rounded-xl border border-sky-600 px-5 py-2 text-base font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-300 dark:hover:bg-sky-950"
        >
          📍 現在地
        </button>
      </form>

      {favLoaded && (
        <nav aria-label="お気に入りの都市">
          {favorites.length === 0 ? (
            <p className="text-base opacity-60">
              お気に入りはまだありません。天気を表示して「☆
              お気に入りに追加」を押すと、ここに並びます。
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {favorites.map((f) => {
                const active = data && favId(f) === favId(data);
                return (
                  <li key={favId(f)}>
                    <button
                      type="button"
                      onClick={() => loadFavorite(f)}
                      disabled={loading}
                      aria-current={active ? "true" : undefined}
                      className={`min-h-11 rounded-xl border px-4 py-2 text-base font-medium disabled:opacity-50 ${
                        active
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-sky-600 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950"
                      }`}
                    >
                      ★ {f.city}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-sky-50 px-4 py-3 text-base text-sky-800 dark:bg-sky-950/60 dark:text-sky-200"
        >
          {notice}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base opacity-60">
                {data.city}（{data.country}）・{formatDate(day.date)}
                {isToday && "・今日"}
              </p>
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={isFav}
                className={`min-h-11 rounded-xl border px-4 py-2 text-base font-medium ${
                  isFav
                    ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    : "border-black/20 hover:bg-black/5 dark:border-white/25 dark:hover:bg-white/10"
                }`}
              >
                {isFav ? "★ 登録済み" : "☆ お気に入りに追加"}
              </button>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <WeatherIcon
                code={isToday ? data.current.icon : day.icon}
                size={96}
                label={isToday ? data.current.description : day.description}
              />
              <div>
                <p className="text-lg font-medium">
                  {isToday ? data.current.description : day.description}
                </p>
                {isToday && (
                  <p className="text-sm opacity-60">
                    現在 {data.current.temp}°C
                  </p>
                )}
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="最高気温"
                value={`${day.tempMax}°C`}
                className="text-red-500"
              />
              <Stat
                label="最低気温"
                value={`${day.tempMin}°C`}
                className="text-blue-500"
              />
              <Stat label="湿度" value={`${day.humidity}%`} />
              <Stat label="降水確率" value={`${day.pop}%`} />
            </dl>

            <h2 className="mt-6 text-base font-semibold opacity-70">
              3時間ごとの予報
            </h2>
            <p className="mb-1 text-sm opacity-60">横にスクロールできます →</p>
            {!day.hourly.some(isWalkTime) && (
              <p className="mb-2 rounded-xl bg-amber-50 px-4 py-3 text-base text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                🐾
                今日はお散歩向きの時間がありません。短めのお散歩や室内遊びがおすすめです
              </p>
            )}
            <HourlyScroller key={`${data.lat},${data.lon},${day.date}`}>
              {day.hourly.map((h) => {
                const walk = isWalkTime(h);
                return (
                  <li
                    key={h.time}
                    className={`flex min-w-28 shrink-0 snap-start flex-col items-center rounded-xl border-2 px-2 py-3 text-sm ${
                      walk
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50"
                        : "border-transparent bg-black/5 dark:bg-white/10"
                    }`}
                  >
                    <span className="opacity-70">{h.time}</span>
                    <WeatherIcon
                      code={h.icon}
                      night={isNightTime(h.time)}
                      size={48}
                      label={h.description}
                      className="mt-1 mb-3"
                    />
                    <span className="text-base font-semibold leading-normal">
                      {h.temp}°C
                    </span>
                    <span className="mt-1 text-sky-600 dark:text-sky-300">
                      {h.pop}%
                    </span>
                    {/* 枠線・背景に加え、マークと文字でも示す。高さをそろえるため該当しない枠にも場所を確保 */}
                    <span
                      className={`mt-2 min-h-6 whitespace-nowrap text-sm font-semibold ${
                        walk
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "invisible"
                      }`}
                      aria-hidden={!walk}
                    >
                      🐾 お散歩向き
                    </span>
                  </li>
                );
              })}
            </HourlyScroller>
            <p className="mt-4 text-xs opacity-60">
              🐾 お散歩向きの条件：降水確率{WALK_MAX_POP}%以下、気温
              {WALK_MIN_TEMP}〜{WALK_MAX_TEMP}℃（21時〜翌5時は対象外）
            </p>
            <p className="mt-2 text-xs opacity-50">
              予報は今日から最大5日先まで（OpenWeatherMap
              無料プランの範囲）。選べない日付は無効になっています。
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-xs opacity-60">{label}</dt>
      <dd className={`text-2xl font-semibold ${className}`}>{value}</dd>
    </div>
  );
}
