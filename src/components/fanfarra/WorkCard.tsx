import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { Work } from "@/lib/fanfarra/types";
import { MediaIcon } from "./MediaIcon";

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
  return (
    <Link
      to="/work/$id"
      params={{ id: work.id }}
      className="block w-[110px] shrink-0 fan-card overflow-hidden transition-transform active:scale-95"
    >
      <div
        className="w-full aspect-[3/4] flex items-center justify-center relative"
        style={{ background: "var(--fan-border)" }}
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
