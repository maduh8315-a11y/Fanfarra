import type { WrappedData } from "./types";

export default function Slide4Genres({ data }: { data: WrappedData }) {
  const colors = ["var(--fan-pink)", "var(--fan-pink-light)", "var(--fan-text-2)"];
  return (
    <div className="wrapped-slide">
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <polygon points="100,80 200,260 0,260" fill="var(--fan-pink-light)" opacity="0.2" />
        <polygon
          points="850,100 950,100 1000,200 950,300 850,300 800,200"
          fill="var(--fan-text-2)"
          opacity="0.18"
        />
        <polygon
          points="80,820 220,820 290,940 220,1060 80,1060 10,940"
          fill="var(--fan-pink-light)"
          opacity="0.15"
        />
        <polygon points="900,700 1000,860 800,860" fill="var(--fan-text-2)" opacity="0.2" />
        <polygon points="500,30 560,140 440,140" fill="var(--fan-pink)" opacity="0.15" />
      </svg>
      <div className="wrapped-content" style={{ width: "100%" }}>
        <h2
          style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 800, marginBottom: "2.5rem" }}
        >
          Seus <span style={{ color: "var(--fan-pink)" }}>gêneros</span> do ano
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          {data.topGenres.map((g, i) => (
            <div key={g.name}>
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}
              >
                <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>
                  <span style={{ color: "var(--fan-pink-light)", marginRight: "0.5rem" }}>#{i + 1}</span>
                  {g.name}
                </span>
                <span style={{ color: "#FFE6F0", fontWeight: 600 }}>{g.pct}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${g.pct}%`, background: colors[i] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
