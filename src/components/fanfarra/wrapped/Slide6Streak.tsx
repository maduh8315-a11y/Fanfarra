import type { WrappedData } from "./types";

export default function Slide6Streak({ data }: { data: WrappedData }) {
  const days = data.streak;
  const msg =
    days >= 30
      ? "Você é imparável 🔥"
      : days >= 14
        ? "Mantendo o ritmo! 💪"
        : days >= 7
          ? "Boa constância ✨"
          : "Todo dia é um novo começo 🌱";

  return (
    <div className="wrapped-slide">
      <svg className="flames" viewBox="0 0 1000 400" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#CC0022" />
            <stop offset="60%" stopColor="var(--fan-pink)" />
            <stop offset="100%" stopColor="#FFE6F0" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path
          d="M0 400 L0 250 Q 60 180 100 240 Q 140 120 200 220 Q 250 100 320 200 Q 380 60 460 180 Q 530 90 600 200 Q 670 80 750 200 Q 820 130 900 220 Q 950 170 1000 240 L1000 400 Z"
          fill="url(#flameGrad)"
          opacity="0.85"
        />
        <path
          d="M0 400 L0 320 Q 80 270 160 310 Q 240 230 320 300 Q 400 220 500 300 Q 600 230 700 300 Q 800 240 900 310 Q 960 280 1000 320 L1000 400 Z"
          fill="#CC0022"
          opacity="0.8"
        />
      </svg>
      <div className="wrapped-content">
        <p
          style={{
            color: "var(--fan-pink-light)",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            fontSize: "0.85rem",
          }}
        >
          Sua maior sequência
        </p>
        <div
          style={{
            fontSize: "clamp(7rem, 22vw, 16rem)",
            fontWeight: 900,
            lineHeight: 1,
            color: "#FFE6F0",
            textShadow: "0 0 60px rgba(255,0,102,0.6)",
          }}
        >
          {days}
        </div>
        <p style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "-0.5rem" }}>
          dias consecutivos
        </p>
        <p style={{ color: "var(--fan-pink)", fontSize: "1.5rem", fontWeight: 700, marginTop: "1.5rem" }}>
          {msg}
        </p>
      </div>
    </div>
  );
}
