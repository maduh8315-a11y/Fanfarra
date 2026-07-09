// src/routes/wrapped.tsx
// Substitua o conteúdo inteiro deste arquivo pelo código abaixo.
//
// DEPENDÊNCIA NOVA: instale dom-to-image-more se ainda não estiver no projeto:
//   bun add dom-to-image-more
//   (o package.json do Fanfarra já pode ter — verifique antes)
//
// ARQUIVOS NOVOS: crie a pasta src/components/fanfarra/wrapped/ e coloque
// os componentes de slide lá (veja os blocos marcados com // ── ARQUIVO: ──)
// O CSS vai em src/components/fanfarra/wrapped/wrapped.css


import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import domtoimage from "dom-to-image-more";
import { BookMarked, Trophy, Gamepad2, Flame, Zap, Star, Sparkles, Sprout, type LucideIcon } from "lucide-react";
import type { MediaType } from "@/lib/fanfarra/types";
import { useWorks } from "@/lib/fanfarra/store";
import { useProfile } from "@/lib/fanfarra/extras";
import "@/components/fanfarra/wrapped/wrapped.css";
import Slide1Intro from "@/components/fanfarra/wrapped/Slide1Intro";
import Slide2Type from "@/components/fanfarra/wrapped/Slide2Type";
import Slide3Favorite from "@/components/fanfarra/wrapped/Slide3Favorite";
import Slide4Genres from "@/components/fanfarra/wrapped/Slide4Genres";
import Slide5Stats from "@/components/fanfarra/wrapped/Slide5Stats";
import Slide6Streak from "@/components/fanfarra/wrapped/Slide6Streak";
import Slide7Achievements from "@/components/fanfarra/wrapped/Slide7Achievements";
import Slide8End from "@/components/fanfarra/wrapped/Slide8End";
import WrappedPaywall from "@/components/fanfarra/wrapped/WrappedPaywall";
import { useIsPro } from "@/lib/fanfarra/config";
import type { Work } from "@/lib/fanfarra/types";


export const Route = createFileRoute("/wrapped")({
  head: () => ({ meta: [{ title: "Wrapped Anual — Fanfarra" }] }),
  component: WrappedPage,
});

const TOTAL = 8;
const YEAR = new Date().getFullYear();

// ─── helpers para calcular dados reais da biblioteca ────────────────────────

function calcWrappedData(works: Work[], userName: string) {
  const thisYear = works.filter((w) => {
    const d = new Date(w.updatedAt);
    return d.getFullYear() === YEAR;
  });

  // Tipo mais frequente
  const typeCounts: Record<string, number> = {};
  works.forEach((w) => (typeCounts[w.type] = (typeCounts[w.type] ?? 0) + 1));
  const topTypeEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  // Obra favorita (maior rating, desempate por updatedAt)
  const rated = [...works]
    .filter((w) => w.rating > 0)
    .sort((a, b) => b.rating - a.rating || b.updatedAt - a.updatedAt);
  const fav = rated[0];

  // Gêneros top 3
  const genreCounts: Record<string, number> = {};
  works.forEach((w) => w.genres?.forEach((g) => (genreCounts[g] = (genreCounts[g] ?? 0) + 1)));
  const totalGenreHits = Object.values(genreCounts).reduce((a, b) => a + b, 1);
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, pct: Math.round((count / totalGenreHits) * 100) }));

  // Stats
  let hours = 0,
    chapters = 0,
    gamesBeaten = 0;
  works.forEach((w) => {
    const d = w.details ?? {};
    hours += Number(d.hours ?? 0);
    chapters += Number(d.chapter ?? d.page ?? d.episode ?? d.issue ?? d.volume ?? 0);
    if (w.type === "Jogo" && (w.status === "Concluído" || w.status === "Platinado")) gamesBeaten++;
  });

  // Streak (aproximado: dias com updatedAt distinto nos últimos 365 dias)
  const daySet = new Set(works.map((w) => new Date(w.updatedAt).toDateString()));
  const streak = Math.min(daySet.size, 365);

  // Conquistas (baseadas nos selos do extras.ts — aqui mocadas para não depender de importação circular)
  const achievements: { Icon: LucideIcon; name: string }[] = [
    works.length >= 10 ? { Icon: BookMarked, name: "Bibliófilo" } : null,
    works.length >= 50 ? { Icon: Trophy, name: "Colecionador" } : null,
    gamesBeaten >= 1 ? { Icon: Gamepad2, name: "Platinador" } : null,
    streak >= 7 ? { Icon: Flame, name: "Streak 7+" } : null,
    streak >= 30 ? { Icon: Zap, name: "Streak 30+" } : null,
    rated.length >= 5 ? { Icon: Star, name: "Crítico" } : null,
    thisYear.length >= 5 ? { Icon: Sparkles, name: "Ativo " + YEAR } : null,
  ].filter(Boolean) as { Icon: LucideIcon; name: string }[];

  return {
    year: YEAR,
    userName: userName || "Fã",
    favoriteType: topTypeEntry
      ? { type: topTypeEntry[0] as MediaType, name: topTypeEntry[0], count: topTypeEntry[1] }
      : { type: null, name: "Variado", count: works.length },
    favoriteWork: fav
      ? { title: fav.title, rating: fav.rating, status: fav.status }
      : { title: "Nenhuma obra ainda", rating: 0, status: "—" },
    topGenres:
      topGenres.length > 0
        ? topGenres
        : [
            { name: "Fantasia", pct: 80 },
            { name: "Aventura", pct: 60 },
            { name: "Drama", pct: 40 },
          ],
    stats: {
      works: works.length,
      hours: Math.round(hours),
      chapters,
      gamesBeaten,
    },
    streak,
    achievements: achievements.length > 0 ? achievements : [{ Icon: Sprout, name: "Começando" }],
  };
}
// ─── Componente principal ────────────────────────────────────────────────────

function WrappedPage() {
  const nav = useNavigate();
  const works = useWorks();
  const profile = useProfile();
  const isPro = useIsPro();
  const [idx, setIdx] = useState(0);
  const slideRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);

  const data = calcWrappedData(works, profile.username ?? "");

  const go = useCallback((n: number) => {
    setIdx((cur) => Math.max(0, Math.min(TOTAL - 1, n)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, go]);

  const handleDownload = useCallback(async () => {
    if (!slideRef.current) return;
    try {
      const dataUrl = await domtoimage.toPng(slideRef.current, {
        bgcolor: "var(--fan-bg)",
        width: slideRef.current.clientWidth,
        height: slideRef.current.clientHeight,
      });
      const link = document.createElement("a");
      link.download = `fanfarra-wrapped-${data.year}-slide${idx + 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Falha ao gerar imagem:", err);
    }
  }, [idx, data.year]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    touchStart.current = null;
  };

 const slides = [
    <Slide1Intro key="1" data={data} onStart={() => go(1)} />,
    <Slide2Type key="2" data={data} />,
    <Slide3Favorite key="3" data={data} />,
    isPro ? <Slide4Genres key="4" data={data} /> : <WrappedPaywall key="4" />,
    isPro ? <Slide5Stats key="5" data={data} /> : <WrappedPaywall key="5" />,
    isPro ? <Slide6Streak key="6" data={data} /> : <WrappedPaywall key="6" />,
    isPro ? <Slide7Achievements key="7" data={data} /> : <WrappedPaywall key="7" />,
    <Slide8End key="8" data={data} />,
  ];

  return (
    <div
      style={{ background: "var(--fan-bg)", minHeight: "100vh", overflow: "hidden" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Botão voltar */}
      <button
        onClick={() => nav({ to: "/" })}
        style={{
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 60,
          background: "rgba(13,0,8,0.7)",
          border: "1px solid rgba(255,0,102,0.4)",
          color: "var(--fan-text)",
          borderRadius: "50%",
          width: 40,
          height: 40,
          fontSize: "1.1rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Voltar"
      >
        ←
      </button>

      {/* Slide */}
      <div ref={slideRef}>{slides[idx]}</div>

      {/* ── SETAS: movidas para baixo (acima dos dots) para não cobrir conteúdo ── */}
      <button
        className="wrapped-arrow left"
        onClick={() => go(idx - 1)}
        disabled={idx === 0}
        aria-label="Slide anterior"
      >
        ‹
      </button>
      <button
        className="wrapped-arrow right"
        onClick={() => go(idx + 1)}
        disabled={idx === TOTAL - 1}
        aria-label="Próximo slide"
      >
        ›
      </button>

      {/* ── BOTÃO BAIXAR PNG (fixo, canto superior direito) — só aparece nos slides 1–7 ── */}
     {idx < TOTAL - 1 && (isPro || idx < 3) && (
        <button className="wrapped-btn wrapped-download" onClick={handleDownload}>
          ⬇ Baixar PNG
        </button>
      )}

      {/* Indicadores de slide */}
      <div className="wrapped-nav">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            className={`wrapped-dot ${i === idx ? "active" : ""}`}
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
