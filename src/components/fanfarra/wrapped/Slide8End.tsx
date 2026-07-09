import type { WrappedData } from "./types";

export default function Slide8End({ data }: { data: WrappedData }) {
  const rows = 8;
  const cols = 5;
  return (
    <div className="wrapped-slide">
      {/* Fundo com "FANFARRA" repetido em grade rotacionada */}
      <div
        style={{
          position: "absolute",
          inset: "-10%",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: "minmax(120px, auto)",
          transform: "rotate(15deg)",
          pointerEvents: "none",
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div
            key={i}
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 900,
              color: "var(--fan-pink)",
              opacity: 0.06,
              textAlign: "center",
              letterSpacing: "0.15em",
            }}
          >
            FANFARRA
          </div>
        ))}
      </div>

      <div className="wrapped-content">
        <div style={{ fontSize: "3rem" }}>✨</div>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 800, margin: "0.5rem 0" }}>
          Até o próximo <span style={{ color: "var(--fan-pink)" }}>ano</span>
        </h1>
        <p style={{ color: "var(--fan-pink-light)", marginTop: "1rem", fontSize: "1.2rem" }}>
          Obrigado por compartilhar seu ano,
        </p>
        <p style={{ color: "var(--fan-text)", fontSize: "2rem", fontWeight: 800 }}>{data.userName}</p>

        {/* Só o botão Compartilhar — o de baixar foi removido daqui */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            marginTop: "2rem",
            flexWrap: "wrap",
          }}
        >
          <button className="wrapped-btn secondary">↗ Compartilhar</button>
        </div>
      </div>
    </div>
  );
}
