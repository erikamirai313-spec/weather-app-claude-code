export type HourlyForecast = {
  time: string; // 現地時刻 "HH:mm"
  temp: number;
  icon: string;
  description: string;
  pop: number; // 降水確率 0-100
};

export type DayForecast = {
  date: string; // 現地日付 "YYYY-MM-DD"
  tempMax: number;
  tempMin: number;
  humidity: number;
  pop: number; // その日の最大降水確率 0-100
  icon: string;
  description: string;
  hourly: HourlyForecast[];
};

export type CurrentWeather = {
  temp: number;
  icon: string;
  description: string;
  humidity: number;
};

export type WeatherResponse = {
  city: string;
  country: string;
  today: string; // 現地の今日 "YYYY-MM-DD"
  current: CurrentWeather;
  days: DayForecast[]; // 選択可能な日（今日〜）
};
