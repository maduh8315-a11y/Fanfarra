import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { Sparkles } from "lucide-react";
import type { WrappedData } from "./types";

export default function Slide2Type({ data }: { data: WrappedData }) {
  const rings = [
    { size: 200, color: "var(--fan-pink)", delay: 0 },
    { size: 740, color: "#CC0022", delay: 1.5 },
    { size: 560, color: "var(--fan-pink)", delay: 1 },
    { size: 740, color: "#CC0022", delay: 1.5 },
    { size: 920, color: "var(--fan-pink)", delay: 2 },
  ];
  return (
    <div className="wrapped-slide">
      {rings.map((r, i) => (
        <div
          key={i}
          className="pulse-ring"
          style={{
            width: r.size,
            height: r.size,
            marginLeft: -r.size / 2,
            marginTop: -r.size / 2,
            border: `2px solid ${r.color}`,
            opacity: 0.2,
            animationDelay: `${r.delay}s`,
          }}
        />
      ))}
      <div className="wrapped-content">
        <div style={{ display: "flex", justifyContent: "center" }}>
          {data.favoriteType.type ? (
            <MediaIcon type={data.favoriteType.type} size={120} color="var(--fan-icon-blue)" />
          ) : (
            <Sparkles size={120} color="var(--fan-icon-blue)" />
          )}
        </div>
        <p style={{ color: "var(--fan-pink-light)", marginTop: "1rem", fontSize: "1.1rem" }}>
          Seu tipo favorito foi
        </p>
        <h1
          style={{
            fontSize: "clamp(3rem, 9vw, 6rem)",
            fontWeight: 900,
            color: "var(--fan-pink)",
            margin: "0.5rem 0",
          }}
        >
          {data.favoriteType.name}
        </h1>
       <p style={{ color: "var(--fan-text-3)", fontSize: "1.25rem" }}>
          {data.favoriteType.count} obras adicionadas
        </p>
      </div>
    </div>
  );
}
