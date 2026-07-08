import type { WrappedData } from "./types";

export default function Slide1Intro({ data, onStart }: { data: WrappedData; onStart: () => void }) {
  const waves = [0, 1, 2, 3, 4, 5];
  return (
    <div className="wrapped-slide">
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        preserveAspectRatio="none"
        viewBox="0 0 1000 1000"
      >
        {waves.map((i) => {
          const y = 120 + i * 140;
          const op = 0.1 + (i % 3) * 0.07;
          return (
            <path
              key={i}
              d={`M0 ${y} Q 250 ${y - 60} 500 ${y} T 1000 ${y}`}
              stroke="var(--fan-pink)"
              strokeWidth={3}
              fill="none"
              opacity={op}
            />
          );
        })}
      </svg>
      <div className="wrapped-content">
        <div
          style={{
            color: "var(--fan-pink-light)",
            letterSpacing: "0.3em",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          FANFARRA WRAPPED
        </div>
        <h1
          style={{
            fontSize: "clamp(2.5rem, 7vw, 5rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Seu ano em <span style={{ color: "var(--fan-pink)" }}>review</span>
        </h1>
        <div
          style={{
            fontSize: "clamp(3rem, 10vw, 7rem)",
            fontWeight: 900,
            color: "#FFE6F0",
            marginTop: "0.5rem",
          }}
        >
          {data.year}
        </div>
        <p style={{ color: "var(--fan-pink-light)", marginTop: "1.5rem", fontSize: "1.1rem" }}>
          Uma retrospectiva das suas mídias favoritas
        </p>
        <button className="wrapped-btn" style={{ marginTop: "2.5rem" }} onClick={onStart}>
          Começar →
        </button>
      </div>
    </div>
  );
}
