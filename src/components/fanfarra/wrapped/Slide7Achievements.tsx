import { useMemo } from "react";
import type { WrappedData } from "./types";

const PALETTE = ["var(--fan-pink)", "var(--fan-pink-light)", "#CC0022", "#FFE6F0", "var(--fan-text-2)"];

export default function Slide7Achievements({ data }: { data: WrappedData }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: (i * 53) % 100,
        delay: ((i * 17) % 50) / 10,
        duration: 5 + ((i * 7) % 6),
        color: PALETTE[i % PALETTE.length],
        rot: (i * 47) % 360,
      })),
    [],
  );

  return (
    <div className="wrapped-slide">
      {confetti.map((c, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${c.left}%`,
            background: c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            transform: `rotate(${c.rot}deg)`,
          }}
        />
      ))}
      <div className="wrapped-content">
        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, marginBottom: "0.5rem" }}>
          Conquistas <span style={{ color: "var(--fan-pink)" }}>desbloqueadas</span>
        </h2>
        <p style={{ color: "var(--fan-pink-light)", marginBottom: "2rem" }}>
          {data.achievements.length} novos selos este ano
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          {data.achievements.map((a) => (
            <div
              key={a.name}
              style={{
                background: "rgba(255,0,102,0.1)",
                border: "1px solid rgba(255,77,148,0.4)",
                borderRadius: 16,
                padding: "1.25rem 0.75rem",
              }}
            >
              <div style={{ fontSize: "2.25rem" }}>{a.emoji}</div>
              <div
                style={{
                  marginTop: "0.4rem",
                  color: "#FFE6F0",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                {a.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
