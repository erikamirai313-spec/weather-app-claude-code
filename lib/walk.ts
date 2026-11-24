import type { HourlyForecast } from "./types";

// お散歩向きの判定条件
export const WALK_MAX_POP = 20; // 降水確率（%）以下
export const WALK_MIN_TEMP = 5; // 気温（℃）以上
export const WALK_MAX_TEMP = 25; // 気温（℃）以下

// 夜（21時〜翌5時）は対象外
const isNight = (time: string) => {
  const h = Number(time.slice(0, 2));
  return h >= 21 || h < 6;
};

export function isWalkTime(h: HourlyForecast) {
  return (
    !isNight(h.time) &&
    h.pop <= WALK_MAX_POP &&
    h.temp >= WALK_MIN_TEMP &&
    h.temp <= WALK_MAX_TEMP
  );
}
