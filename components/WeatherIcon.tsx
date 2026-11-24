type Kind = "clear" | "partly" | "cloudy" | "rain" | "snow" | "thunder" | "fog";

// OpenWeatherMap のアイコンコード（例 "10d"）→ 天気の種類
function kindOf(code: string): Kind {
  switch (code.slice(0, 2)) {
    case "01":
      return "clear";
    case "02":
      return "partly";
    case "09":
    case "10":
      return "rain";
    case "11":
      return "thunder";
    case "13":
      return "snow";
    case "50":
      return "fog";
    default:
      return "cloudy"; // 03, 04
  }
}

// 線の太さ・角の丸みは全アイコンで共通
const STROKE = 3;
const C = {
  sun: "#FDBA2D",
  sunLine: "#F28C0F",
  moon: "#FFD84D",
  moonLine: "#D9A21B",
  cloud: "#E8ECF1",
  cloudLine: "#98A2B3",
  rain: "#3B82F6",
  snow: "#5BC8F5",
  bolt: "#FFD22E",
  boltLine: "#E0A100",
  fog: "#98A2B3",
};

const CLOUD_PATH = "M18 44h28a9 9 0 0 0 1.5-17.9A13 13 0 0 0 22.4 29 8 8 0 0 0 18 44z";
const MOON_PATH = "M36 12a19 19 0 1 0 17 29A15.5 15.5 0 0 1 36 12z";

function Sun({ cx, cy, r, rays }: { cx: number; cy: number; r: number; rays: number }) {
  return (
    <g strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      <g stroke={C.sunLine}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          const [c, s] = [Math.cos(a), Math.sin(a)];
          return (
            <line
              key={i}
              x1={cx + c * (r + 5)}
              y1={cy + s * (r + 5)}
              x2={cx + c * (r + 5 + rays)}
              y2={cy + s * (r + 5 + rays)}
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={C.sun} stroke={C.sunLine} />
    </g>
  );
}

function Cloud({ y = 0, x = 0 }: { x?: number; y?: number }) {
  return (
    <path
      d={CLOUD_PATH}
      transform={`translate(${x} ${y})`}
      fill={C.cloud}
      stroke={C.cloudLine}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
  );
}

function Moon({ scale = 1, x = 0, y = 0 }: { scale?: number; x?: number; y?: number }) {
  return (
    <path
      d={MOON_PATH}
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill={C.moon}
      stroke={C.moonLine}
      strokeWidth={STROKE / scale}
      strokeLinejoin="round"
    />
  );
}

function Snowflake({ cx, cy }: { cx: number; cy: number }) {
  const r = 3.6;
  return (
    <g stroke={C.snow} strokeWidth={2.4} strokeLinecap="round">
      {[0, 60, 120].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={cx - Math.cos(a) * r}
            y1={cy - Math.sin(a) * r}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
          />
        );
      })}
    </g>
  );
}

function Art({ kind, night }: { kind: Kind; night: boolean }) {
  switch (kind) {
    case "clear":
      return night ? <Moon x={2} y={2} /> : <Sun cx={32} cy={32} r={11} rays={6} />;
    case "partly":
      return (
        <>
          {night ? <Moon scale={0.75} x={4} y={0} /> : <Sun cx={24} cy={25} r={8} rays={4} />}
          <Cloud x={4} y={8} />
        </>
      );
    case "cloudy":
      return <Cloud y={6} />;
    case "rain":
      return (
        <>
          <Cloud y={-4} />
          <g stroke={C.rain} strokeWidth={STROKE} strokeLinecap="round">
            <line x1="24" y1="46" x2="21" y2="54" />
            <line x1="34" y1="46" x2="31" y2="54" />
            <line x1="44" y1="46" x2="41" y2="54" />
          </g>
        </>
      );
    case "snow":
      return (
        <>
          <Cloud y={-4} />
          <Snowflake cx={24} cy={51} />
          <Snowflake cx={34} cy={55} />
          <Snowflake cx={44} cy={51} />
        </>
      );
    case "thunder":
      return (
        <>
          <Cloud y={-4} />
          <path
            d="M35 38 26 51h7l-3 9 11-14h-7z"
            fill={C.bolt}
            stroke={C.boltLine}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
        </>
      );
    case "fog":
      return (
        <g stroke={C.fog} strokeWidth={STROKE + 1} strokeLinecap="round">
          <line x1="14" y1="22" x2="50" y2="22" />
          <line x1="10" y1="32" x2="54" y2="32" />
          <line x1="16" y1="42" x2="48" y2="42" />
          <line x1="22" y1="52" x2="42" y2="52" />
        </g>
      );
  }
}

/**
 * 天気アイコン（自作 SVG）。
 * night を省略すると、コードの末尾 "n"（夜）で判定する。
 */
export default function WeatherIcon({
  code,
  size,
  label,
  night,
  className = "",
}: {
  code: string;
  size: number;
  label: string;
  night?: boolean;
  className?: string;
}) {
  const isNight = night ?? code.endsWith("n");
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={`shrink-0 ${className}`}
    >
      <Art kind={kindOf(code)} night={isNight} />
    </svg>
  );
}
