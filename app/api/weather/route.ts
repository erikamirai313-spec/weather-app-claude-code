import type { NextRequest } from "next/server";
import type { DayForecast, WeatherResponse } from "@/lib/types";

const BASE = "https://api.openweathermap.org/data/2.5";
const MAX_DAYS = 6; // 今日 + 5日先

type OwmWeather = { description: string; icon: string };
type OwmCurrent = {
  name: string;
  sys: { country: string };
  timezone: number;
  dt: number;
  main: { temp: number; humidity: number; temp_min: number; temp_max: number };
  weather: OwmWeather[];
};
type OwmForecastItem = {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: OwmWeather[];
  pop?: number;
};
type OwmForecast = {
  city: { name: string; country: string; timezone: number };
  list: OwmForecastItem[];
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// UTC 秒 + タイムゾーンオフセット(秒) → 現地の ISO 文字列 "YYYY-MM-DDTHH:mm"
function localParts(dt: number, tz: number) {
  const iso = new Date((dt + tz) * 1000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return json(
      { error: "サーバーに OPENWEATHER_API_KEY が設定されていません。.env.local を確認してください。" },
      500,
    );
  }

  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const lat = sp.get("lat");
  const lon = sp.get("lon");

  const params = new URLSearchParams({ units: "metric", lang: "ja", appid: apiKey });
  if (q) {
    params.set("q", q);
  } else if (lat !== null && lon !== null && Number.isFinite(+lat) && Number.isFinite(+lon)) {
    params.set("lat", lat);
    params.set("lon", lon);
  } else {
    return json({ error: "都市名または緯度・経度を指定してください。" }, 400);
  }

  let curRes: Response, fcRes: Response;
  try {
    [curRes, fcRes] = await Promise.all([
      fetch(`${BASE}/weather?${params}`, { cache: "no-store" }),
      fetch(`${BASE}/forecast?${params}`, { cache: "no-store" }),
    ]);
  } catch {
    return json({ error: "天気サービスに接続できませんでした。" }, 502);
  }

  for (const res of [curRes, fcRes]) {
    if (res.status === 404) return json({ error: "都市が見つかりませんでした。" }, 404);
    if (res.status === 401)
      return json({ error: "API キーが無効です（有効化まで数時間かかる場合があります）。" }, 502);
    if (res.status === 429) return json({ error: "API の呼び出し回数の上限に達しました。" }, 502);
    if (!res.ok) return json({ error: "天気情報の取得に失敗しました。" }, 502);
  }

  const cur: OwmCurrent = await curRes.json();
  const fc: OwmForecast = await fcRes.json();
  const tz = fc.city.timezone;
  const today = localParts(cur.dt, cur.timezone).date;

  // 3時間ごとの予報を現地日付ごとにまとめる
  const byDate = new Map<string, OwmForecastItem[]>();
  for (const item of fc.list) {
    const { date } = localParts(item.dt, tz);
    if (date < today) continue;
    byDate.set(date, [...(byDate.get(date) ?? []), item]);
  }

  const days: DayForecast[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, MAX_DAYS)
    .map(([date, items]) => {
      const temps = items.flatMap((i) => [i.main.temp_min, i.main.temp_max]);
      // 今日は現在の観測値も最高・最低に含める
      if (date === today) temps.push(cur.main.temp);
      // 代表アイコンは日中(昼寄り)の予報から多数決で選ぶ
      const daytime = items.filter((i) => {
        const h = Number(localParts(i.dt, tz).time.slice(0, 2));
        return h >= 6 && h < 21;
      });
      const pool = daytime.length ? daytime : items;
      const icon = mostFrequent(pool.map((i) => i.weather[0].icon.replace("n", "d")));
      const rep = pool.find((i) => i.weather[0].icon.replace("n", "d") === icon) ?? pool[0];
      return {
        date,
        tempMax: Math.round(Math.max(...temps)),
        tempMin: Math.round(Math.min(...temps)),
        humidity: Math.round(items.reduce((s, i) => s + i.main.humidity, 0) / items.length),
        pop: Math.round(Math.max(...items.map((i) => i.pop ?? 0)) * 100),
        icon,
        description: rep.weather[0].description,
        hourly: items.map((i) => ({
          time: localParts(i.dt, tz).time,
          temp: Math.round(i.main.temp),
          icon: i.weather[0].icon,
          description: i.weather[0].description,
          pop: Math.round((i.pop ?? 0) * 100),
        })),
      };
    });

  const body: WeatherResponse = {
    city: cur.name || fc.city.name,
    country: cur.sys.country || fc.city.country,
    today,
    current: {
      temp: Math.round(cur.main.temp),
      icon: cur.weather[0].icon,
      description: cur.weather[0].description,
      humidity: cur.main.humidity,
    },
    days,
  };
  return json(body);
}
