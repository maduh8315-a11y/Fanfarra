import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { Work } from "@/lib/fanfarra/types";
import { MediaIcon } from "./MediaIcon";
import { getTypeColor, getTypeCardBg, getTypeCardBorder } from "@/lib/fanfarra/typeColors";

export function WorkCard({ work }: { work: Work }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const pct =
    work.total > 0
      ? Math.min(100, (work.current / work.total) * 100)
      : work.status === "Concluído"
        ? 100
        : 0;
  const subtitle =
    work.type === "Anime" ||
    work.type === "Série" ||
    work.type === "Donghua" ||
    work.type === "Dorama"
      ? `Ep ${work.current}${work.total ? `/${work.total}` : ""}`
      : work.type === "Livro"
        ? `Pág ${work.current}${work.total ? `/${work.total}` : ""}`
        : work.type === "Filme"
          ? work.status === "Concluído"
            ? "Assistido"
            : "Não assistido"
          : work.type === "Música"
            ? `${work.current} escutas`
            : `Cap ${work.current}${work.total ? `/${work.total}` : ""}`;
  const hasCover = !!work.cover;
  const typeColor = getTypeColor(work.type);
  return (
    <Link
      to="/work/$id"
      params={{ id: work.id }}
      className="block w-[110px] shrink-0 fan-card overflow-hidden transition-transform active:scale-95"
      style={
        hasCover
          ? {
              boxShadow: `0 0 0 1px color-mix(in srgb, ${typeColor} 55%, transparent), 0 0 14px 0 color-mix(in srgb, ${typeColor} 40%, transparent)`,
            }
          : { background: getTypeCardBg(work.type), border: `0.5px solid ${getTypeCardBorder(work.type)}` }
      }
    >
      <div
        className="w-full aspect-[3/4] flex items-center justify-center relative"
        style={{ background: hasCover ? "var(--fan-border)" : "transparent" }}
      >
        {work.cover ? (
          <img
            src={work.cover}
            alt={work.title}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            className="w-full h-full object-cover"
            style={{
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 250ms ease",
            }}
          />
        ) : (
          <MediaIcon type={work.type} size={28} className="opacity-80" />
        )}
      </div>
      <div className="p-2">
        <div className="text-sm font-bold truncate" style={{ color: "var(--fan-text-3)" }}>
          {work.title}
        </div>
        <div className="text-sm mt-0.5" style={{ color: "var(--fan-pink)" }}>
          {subtitle}
        </div>
        <div
          className="mt-1.5 h-[3px] rounded-full overflow-hidden"
          style={{ background: "var(--fan-border)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: "var(--fan-pink)" }}
          />
        </div>
      </div>
    </Link>
  );
}
