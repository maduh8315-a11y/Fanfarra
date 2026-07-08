import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame, Sparkles, BookOpen, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useWorks } from "@/lib/fanfarra/store";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { Link } from "@tanstack/react-router";
import {
  CATALOG,
  scoreItems,
  getByType,
  getTrending,
  communityToRecommendationItem,
  type RecommendationItem,
} from "@/lib/fanfarra/recommendations";
import { MEDIA_TYPES, type MediaType } from "@/lib/fanfarra/types";
import {
  RecFilterSheet,
  DEFAULT_REC_FILTERS,
  applyRecFilters,
  type RecFilters,
} from "@/components/fanfarra/RecFilterSheet";
import { useProfile } from "@/lib/fanfarra/extras";
import { usePublicRecommendations } from "@/lib/fanfarra/communityStore";

export const Route = createFileRoute("/recommendations")({
  head: () => ({ meta: [{ title: "Recomendações — Fanfarra" }] }),
  component: RecPage,
});

const ALL_TYPES = ["Todos", ...MEDIA_TYPES] as const;
type TypeTab = (typeof ALL_TYPES)[number];

function RecPage() {
  const works = useWorks();
  const profile = useProfile();
  const [tab, setTab] = useState<TypeTab>("Todos");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<RecFilters>(DEFAULT_REC_FILTERS);

  const scored = useMemo(() => {
    const items = scoreItems(CATALOG, works);
    // Marca itens que o usuário tem na biblioteca com seu @username
    const libraryTitles = new Set(works.map((w) => w.title.toLowerCase()));
    return items.map((item) =>
      libraryTitles.has(item.title.toLowerCase())
        ? { ...item, recommendedBy: profile.username }
        : item,
    );
  }, [works, profile.username]);
  const trending = useMemo(() => getTrending(scored, 12), [scored]);

  // Recomendações postadas por qualquer usuário — visíveis para todo mundo
  const community = usePublicRecommendations();
  const communityItems = useMemo<RecommendationItem[]>(
    () => community.map(communityToRecommendationItem),
    [community],
  );

  const topTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    works.forEach((w) => (counts[w.type] = (counts[w.type] ?? 0) + 1));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);
  }, [works]);

  // Verifica se algum filtro está ativo
  const hasActiveFilters = useMemo(() => {
    const f = filters;
    return (
      f.query ||
      f.title ||
      f.author ||
      f.yearMin ||
      f.yearMax ||
      f.fandom ||
      f.minPopularity > 0 ||
      f.types.length > 0 ||
      f.genres.length > 0 ||
      f.statuses.length > 0
    );
  }, [filters]);

  // Se filtro ativo, mostra resultado filtrado em vez das seções normais
  const filteredResults = useMemo(() => {
    if (!hasActiveFilters) return null;
    return applyRecFilters(scored, filters);
  }, [scored, filters, hasActiveFilters]);

  const forYou = useMemo(() => {
    if (tab === "Todos") return scored.slice(0, 30);
    return getByType(scored, tab, 30);
  }, [scored, tab]);

  return (
    <AppShell>
      {/* Header — sem seta de voltar */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Recomendações
        </h1>
        <button
          onClick={() => setFilterOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
          style={{
            background: hasActiveFilters ? "var(--fan-pink)" : "var(--fan-bg-2)",
            color: hasActiveFilters ? "#fff" : "var(--fan-text-2)",
            border: `1px solid ${hasActiveFilters ? "var(--fan-pink)" : "var(--fan-border)"}`,
          }}
        >
          <SlidersHorizontal size={13} />
          Filtrar
          {hasActiveFilters && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "#fff", color: "var(--fan-pink)" }}
            >
              ●
            </span>
          )}
        </button>
      </header>

      {/* Modo filtrado */}
      {filteredResults ? (
        <section className="pb-32 px-4 mt-2">
          <p className="text-[11px] mb-3" style={{ color: "var(--fan-text-3)" }}>
            {filteredResults.length} resultado{filteredResults.length !== 1 ? "s" : ""} encontrado
            {filteredResults.length !== 1 ? "s" : ""}
          </p>
          {filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-[13px]" style={{ color: "var(--fan-text-2)" }}>
                Nenhuma obra encontrada
              </p>
              <button
                onClick={() => setFilters(DEFAULT_REC_FILTERS)}
                className="text-[12px]"
                style={{ color: "var(--fan-pink)" }}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredResults.map((item) => (
                <CatalogCard key={item.id} item={item} grid />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Comunidade — recomendações públicas postadas por qualquer usuário */}
          <section className="mt-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: "var(--fan-pink-light)" }}>👥</span>
              <h2 className="text-[12px] font-bold" style={{ color: "var(--fan-text-3)" }}>
                Da comunidade
              </h2>
            </div>
            {communityItems.length === 0 ? (
              <div
                className="rounded-[14px] p-4 flex flex-col items-center text-center gap-2"
                style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
              >
                <span className="text-2xl">🌐</span>
                <p className="text-[12px] font-semibold" style={{ color: "var(--fan-text)" }}>
                  Nenhuma recomendação ainda
                </p>
                <p className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
                  Marque uma obra sua como "Recomendar publicamente" para ser a primeira pessoa a
                  aparecer aqui.
                </p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {communityItems.map((item) => (
                  <CatalogCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          {/* Trending */}
          <section className="mt-2">
            <div className="flex items-center gap-2 px-4 mb-3">
              <Flame size={15} color="var(--fan-pink-light)" />
              <h2 className="text-[12px] font-bold" style={{ color: "var(--fan-text-3)" }}>
                Mais populares
              </h2>
            </div>
            <div
              className="flex gap-3 overflow-x-auto px-4 pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {trending.map((item) => (
                <CatalogCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          {/* Baseado no seu gosto */}
          {topTypes.length > 0 && (
            <section className="mt-5">
              <div className="flex items-center gap-2 px-4 mb-3">
                <Sparkles size={15} color="var(--fan-pink-light)" />
                <h2 className="text-[12px] font-bold" style={{ color: "var(--fan-text-3)" }}>
                  Baseado no seu gosto
                </h2>
              </div>
              {topTypes.map((type) => {
                const items = getByType(scored, type, 8);
                if (!items.length) return null;
                return (
                  <div key={type} className="mb-4">
                    <p className="px-4 text-[11px] mb-2" style={{ color: "var(--fan-text-2)" }}>
                      {type}
                    </p>
                    <div
                      className="flex gap-3 overflow-x-auto px-4 pb-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {items.map((item) => (
                        <CatalogCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Explorar por tipo */}
          <section className="mt-5 pb-32">
            <div className="flex items-center gap-2 px-4 mb-3">
              <BookOpen size={15} color="var(--fan-pink-light)" />
              <h2 className="text-[12px] font-bold" style={{ color: "var(--fan-text-3)" }}>
                Explorar
              </h2>
            </div>
            <div
              className="flex gap-2 overflow-x-auto px-4 pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition"
                  style={{
                    background: tab === t ? "var(--fan-pink)" : "var(--fan-bg-2)",
                    color: tab === t ? "#fff" : "var(--fan-text-2)",
                    border: `1px solid ${tab === t ? "var(--fan-pink)" : "var(--fan-border)"}`,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 px-4 mt-3">
              {forYou.map((item) => (
                <CatalogCard key={item.id} item={item} grid />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Filter Sheet */}
      <RecFilterSheet
        open={filterOpen}
        initial={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => setFilters(f)}
      />
    </AppShell>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

function CatalogCard({ item, grid = false }: { item: RecommendationItem; grid?: boolean }) {
  const size = grid ? "w-full" : "w-28 shrink-0";
  return (
    <Link to="/rec/$id" params={{ id: item.id }} className={`${size} relative group block`}>
      <div
        className="w-full rounded-[10px] flex flex-col items-center justify-center overflow-hidden relative"
        style={{
          aspectRatio: "2/3",
          background: "linear-gradient(135deg, var(--fan-bg-2), var(--fan-active-chip))",
          border: "1px solid var(--fan-rose-mid)",
        }}
      >
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <>
            <MediaIcon type={item.type as MediaType} size={28} color="var(--fan-pink-light)" />
            <span
              className="text-[9px] mt-1 text-center px-1 font-semibold line-clamp-2"
              style={{ color: "var(--fan-text-2)" }}
            >
              {item.type}
            </span>
          </>
        )}
        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
          style={{ background: "rgba(13,0,8,0.75)", color: "var(--fan-pink-light)" }}
        >
          ★ {item.popularity}
        </div>
      </div>
      <p
        className="mt-1 text-[10px] font-semibold line-clamp-2 leading-tight"
        style={{ color: "var(--fan-text)" }}
      >
        {item.title}
      </p>
      <p className="text-[9px] line-clamp-1" style={{ color: "var(--fan-text-2)" }}>
        {item.author}
      </p>
      {item.recommendedBy && (
        <p className="text-[8px] font-semibold mt-0.5" style={{ color: "var(--fan-pink-light)" }}>
          @{item.recommendedBy}
        </p>
      )}
    </Link>
  );
}
