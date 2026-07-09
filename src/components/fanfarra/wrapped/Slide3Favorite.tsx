import { useMemo } from "react";
import { Star } from "lucide-react";
import type { WrappedData } from "./types";

export default function Slide3Favorite({ data }: { data: WrappedData }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        x: (i * 73) % 100,
        y: (i * 137) % 100,
        delay: ((i * 31) % 30) / 10,
        size: 4 + ((i * 13) % 8),
      })),
    [],
  );

  return (
    <div className="wrapped-slide">
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            background: i % 3 === 0 ? "#FFE6F0" : i % 3 === 1 ? "var(--fan-pink)" : "var(--fan-pink-light)",
          }}
        />
      ))}
      <div className="wrapped-content">
        <p
          style={{
            color: "var(--fan-pink-light)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontSize: "0.85rem",
          }}
        >
          Obra favorita
        </p>
        <div className="wrapped-card" style={{ marginTop: "1.5rem" }}>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 800,
              margin: 0,
              color: "#FFE6F0",
            }}
          >
            {data.favoriteWork.title}
          </h2>
          <div style={{ marginTop: "1.25rem", display: "flex", gap: 4 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={28}
                fill={i < data.favoriteWork.rating ? "var(--fan-pink)" : "none"}
                color={i < data.favoriteWork.rating ? "var(--fan-pink)" : "rgba(255,230,240,0.25)"}
              />
            ))}
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: "1.25rem",
              padding: "0.4rem 1rem",
              borderRadius: 999,
              background: "rgba(204, 102, 153, 0.2)",
              color: "var(--fan-text-2)",
              border: "1px solid var(--fan-text-2)",
              fontWeight: 600,
            }}
          >
            {data.favoriteWork.status}
          </div>
        </div>
      </div>
    </div>
  );
}