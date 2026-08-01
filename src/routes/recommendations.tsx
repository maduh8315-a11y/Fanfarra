import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/fanfarra/EmptyState";
import { Flame, Sparkles, BookOpen, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useWorks } from "@/lib/fanfarra/store";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { AwardCrownBadge } from "@/components/fanfarra/AwardCrownBadge";
import { getTypeColor, getTypeCardBg, getTypeCardBorder } from "@/lib/fanfarra/typeColors";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
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
import { filterBlockedForAge } from "@/lib/fanfarra/contentGate";
import { useProfile } from "@/lib/fanfarra/extras";
import {
  usePublicRecommendations,
  usePublicRecommendationsLoading,
  useCommunityHasMore,
  useCommunityLoadingMore,
  loadMoreCommunity,
} from "@/lib/fanfarra/communityStore";

export const Route = createFileRoute("/recommendations")({
  head: () => ({ meta: [{ title: "Recomendações — Fanfarra" }] }),
  component: RecPage,
});

const ALL_TYPES = ["Todos", ...MEDIA_TYPES] as const;
type TypeTab = (typeof ALL_TYPES)[number];

function RecPage() {
  const { birthDate } = useProfile();
  const works = useWorks();
  const profile = useProfile();
  const [tab, setTab] = useState<TypeTab>("Todos");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<RecFilters>(DEFAULT_REC_FILTERS);

  // Recomendações postadas por qualquer usuário — visíveis para todo mundo
  const community = usePublicRecommendations();
  const communityLoading = usePublicRecommendationsLoading();
  const hasMoreCommunity = useCommunityHasMore();
  const loadingMoreCommunity = useCommunityLoadingMore();
  const communityItems = useMemo<RecommendationItem[]>(
    () => filterBlockedForAge(community.map(communityToRecommendationItem), birthDate),
    [community, birthDate],
  );

  const scored = useMemo(() => {
    const items = scoreItems(CATALOG, works);
    // Marca itens que o usuário tem na biblioteca com seu @username
    const libraryTitles = new Set(works.map((w) => w.title.toLowerCase()));
    const withOwn = items.map((item) =>
      libraryTitles.has(item.title.toLowerCase())
        ? { ...item, recommendedBy: profile.username }
        : item,
    );
    // Recomendações da comunidade entram na FRENTE da lista, dentro do
    // tipo/gênero delas (ex.: recomendou um anime -> aparece na frente
    // dos outros animes). Se o título já existe no catálogo padrão,
    // a versão da comunidade substitui pra não duplicar.
    const communityTitles = new Set(communityItems.map((c) => c.title.toLowerCase()));
    const withoutDuplicates = withOwn.filter(
      (item) => !communityTitles.has(item.title.toLowerCase()),
    );
    return [...communityItems, ...withoutDuplicates];
  }, [works, profile.username, communityItems]);
  const trending = useMemo(() => getTrending(scored, 12), [scored]);

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
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
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
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-sm font-bold flex items-center justify-center"
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
          <p className="text-sm mb-3" style={{ color: "var(--fan-text-3)" }}>
            {filteredResults.length} resultado{filteredResults.length !== 1 ? "s" : ""} encontrado
            {filteredResults.length !== 1 ? "s" : ""}
          </p>
          {filteredResults.length === 0 ? (
            <EmptyState
              icon={SlidersHorizontal}
              title="Nenhuma obra encontrada"
              action={
                <button
                  onClick={() => setFilters(DEFAULT_REC_FILTERS)}
                  className="text-sm"
                  style={{ color: "var(--fan-pink)" }}
                >
                  Limpar filtros
                </button>
              }
            />
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
              <h2 className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
                Da comunidade
              </h2>
            </div>
            {communityLoading ? (
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 fan-hscroll" style={{ scrollbarWidth: "none" }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-28 shrink-0">
                    <Skeleton style={{ aspectRatio: "2/3", width: "100%", borderRadius: 10 }} />
                  </div>
                ))}
              </div>
            ) : communityItems.length === 0 ? (
              <div
                className="rounded-[14px] p-4"
                style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
              >
                <EmptyState
                  emoji="🌐"
                  title="Nenhuma recomendação ainda"
                  description='Marque uma obra sua como "Recomendar publicamente" para ser a primeira pessoa a aparecer aqui.'
                  className="p-0"
                />
              </div>
            ) : (
              <>
                <div className="flex gap-3 overflow-x-auto pb-2 fan-hscroll" style={{ scrollbarWidth: "none" }}>
                  {communityItems.map((item) => (
                    <CatalogCard key={item.id} item={item} />
                  ))}
                </div>
                {hasMoreCommunity && (
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={loadMoreCommunity}
                      disabled={loadingMoreCommunity}
                      className="rounded-full px-4 py-2 text-xs font-bold"
                      style={{
                        background: "var(--fan-bg-2)",
                        border: "1px solid var(--fan-pink)",
                        color: "var(--fan-pink-light)",
                        opacity: loadingMoreCommunity ? 0.6 : 1,
                      }}
                    >
                      {loadingMoreCommunity ? "Carregando..." : "Carregar mais"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Trending */}
          <section className="mt-2">
            <div className="flex items-center gap-2 px-4 mb-3">
              <Flame size={15} color="var(--fan-icon-blue)" />
              <h2 className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
                Mais populares
              </h2>
            </div>
            <div
              className="flex gap-3 overflow-x-auto px-4 pb-2 fan-hscroll"
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
                <Sparkles size={15} color="var(--fan-icon-blue)" />
                <h2 className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
                  Baseado no seu gosto
                </h2>
              </div>
              {topTypes.map((type) => {
                const items = getByType(scored, type, 8);
                if (!items.length) return null;
                return (
                  <div key={type} className="mb-4">
                    <p className="px-4 text-sm mb-2" style={{ color: "var(--fan-text-2)" }}>
                      {type}
                    </p>
                    <div
                      className="flex gap-3 overflow-x-auto px-4 pb-1 fan-hscroll"
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
              <BookOpen size={15} color="var(--fan-icon-blue)" />
              <h2 className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
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

export function CatalogCard({ item, grid = false }: { item: RecommendationItem; grid?: boolean }) {
  const size = grid ? "w-full" : "w-28 shrink-0";
  const navigate = useNavigate();
  return (
    <Link
      to="/rec/$id"
      params={{ id: item.id }}
      className={`${size} relative group block rounded-[10px]`}
      style={{
        boxShadow: `0 0 0 1px color-mix(in srgb, ${getTypeColor(item.type as MediaType)} 55%, transparent), 0 0 9px 0 color-mix(in srgb, ${getTypeColor(item.type as MediaType)} 35%, transparent)`,
      }}
    >
      <div
        className="w-full rounded-[10px] flex flex-col items-center justify-center overflow-hidden relative"
        style={
          item.cover
            ? { aspectRatio: "2/3" }
            : {
                aspectRatio: "2/3",
                background: getTypeCardBg(item.type as MediaType),
                border: `0.5px solid ${getTypeCardBorder(item.type as MediaType)}`,
              }
        }
      >
        <AwardCrownBadge title={item.title} />
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <>
            <MediaIcon type={item.type as MediaType} size={28} />
            <span
              className="text-sm mt-1 text-center px-1 font-semibold line-clamp-2"
              style={{ color: "var(--fan-text-2)" }}
            >
              {item.type}
            </span>
          </>
        )}
        {item.cover && (
          <div
            className="absolute top-0 left-0 right-0 h-10 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}
          />
        )}
        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm"
          style={{ background: "rgba(13,0,8,0.85)", color: getTypeColor(item.type as MediaType) }}
        >
          ★ {item.popularity}
        </div>
      </div>
      <p
        className="mt-2 text-sm font-semibold line-clamp-2 leading-tight text-center"
        style={{ color: "var(--fan-text)" }}
      >
        {item.title}
      </p>
      <p className="text-sm line-clamp-1 text-center" style={{ color: "var(--fan-text-2)" }}>
        {item.author}
      </p>
      {item.recommendedBy && (
        <p
          className="text-sm font-semibold mt-0.5 truncate text-center"
          style={{ color: "var(--fan-pink-light)" }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate({ to: "/u/$username", params: { username: item.recommendedBy! } });
          }}
        >
          @{item.recommendedBy}
        </p>
      )}
    </Link>
  );
}
