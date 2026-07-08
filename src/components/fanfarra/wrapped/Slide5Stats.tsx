import type { WrappedData } from "./types";

export default function Slide5Stats({ data }: { data: WrappedData }) {
  const items = [
    { label: "Obras", value: data.stats.works, icon: "📺" },
    { label: "Horas consumidas", value: data.stats.hours, icon: "⏱️" },
    { label: "Capítulos lidos", value: data.stats.chapters.toLocaleString("pt-BR"), icon: "📖" },
    { label: "Jogos zerados", value: data.stats.gamesBeaten, icon: "🎮" },
  ];
  return (
    <div className="wrapped-slide">
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="diamond" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M20 0 L40 20 L20 40 L0 20 Z"
              fill="none"
              stroke="var(--fan-pink)"
              strokeWidth="1"
              opacity="0.16"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diamond)" />
      </svg>
      <div className="wrapped-content">
        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, marginBottom: "2rem" }}>
          Seus <span style={{ color: "var(--fan-pink)" }}>números</span>
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          {items.map((it) => (
            <div key={it.label} className="stat-card">
              <div style={{ fontSize: "2rem" }}>{it.icon}</div>
              <div
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                  fontWeight: 900,
                  color: "#FFE6F0",
                  marginTop: "0.25rem",
                }}
              >
                {it.value}
              </div>
              <div style={{ color: "var(--fan-pink-light)", marginTop: "0.25rem", fontSize: "0.95rem" }}>
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
