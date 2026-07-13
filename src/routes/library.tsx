import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { EmptyState } from "@/components/fanfarra/EmptyState";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Filter, BookMarked, LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { ClientOnly } from "@/components/fanfarra/ClientOnly";
import { TypeChips, type TypeFilter } from "@/components/fanfarra/Chips";
import { useWorks, useWorksLoading } from "@/lib/fanfarra/store";
import { WorkGridSkeleton } from "@/components/fanfarra/WorkCardSkeleton";
import { useBookcases, addBookcase } from "@/lib/fanfarra/bookcaseStore";
import {
  STATUSES,
  MEDIA_MODES,
  MODE_OF_TYPE,
  MODE_STATUSES,
  MODE_LABELS,
  IN_PROGRESS_STATUSES,
  WISHLIST_STATUSES,
  COMPLETED_STATUSES,
  type Status,
  type MediaMode,
} from "@/lib/fanfarra/types";
import {
  FilterSheet,
  DEFAULT_FILTERS,
  applyFilters,
  type LibraryFilters,
} from "@/components/fanfarra/FilterSheet";
import { BookcaseFormModal } from "@/routes/collections";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { ModeIcon } from "@/components/fanfarra/ModeIcon";


// Grupos de status usados pelas seções da Home ("Recentemente atualizado",
// "Quero consumir", "Concluídos") — permitem que o "Ver tudo" chegue na
// Biblioteca já filtrado, mesmo cobrindo vários status de uma vez (ex:
// "Quero consumir" = Quero ler + Quero assistir + Quero jogar + Quero ouvir).
export const STATUS_GROUPS = {
  "em-andamento": IN_PROGRESS_STATUSES,
  "quero-consumir": WISHLIST_STATUSES,
  concluidos: COMPLETED_STATUSES,
} as const;
export type LibraryStatusGroup = keyof typeof STATUS_GROUPS;

const GROUP_LABELS: Record<LibraryStatusGroup, string> = {
  "em-andamento": "Em andamento",
  "quero-consumir": "Quero consumir",
  concluidos: "Concluídos",
};

function isLibraryStatusGroup(value: unknown): value is LibraryStatusGroup {
  return value === "em-andamento" || value === "quero-consumir" || value === "concluidos";
}

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "Biblioteca — Fanfarra" }] }),
  validateSearch: (search: Record<string, unknown>): { group?: LibraryStatusGroup } => {
    return isLibraryStatusGroup(search.group) ? { group: search.group } : {};
  },
  component: LibraryPage,
});

const MODE_TABS = ["Todos", ...MEDIA_MODES] as const;
type ModeTab = (typeof MODE_TABS)[number];

function LibraryPage() {
  const { group } = Route.useSearch();
  const works = useWorks();
  const worksLoading = useWorksLoading();
  const bookcases = useBookcases();
  const [mode, setMode] = useState<ModeTab>("Todos");
  const [tab, setTab] = useState<Status | "Todos">("Todos");
  const groupStatuses = group ? STATUS_GROUPS[group] : null;

  const statusTabsForMode = useMemo(() => {
    return mode === "Todos" ? (["Todos", ...STATUSES] as const) : (["Todos", ...MODE_STATUSES[mode]] as const);
  }, [mode]);
  const [type, setType] = useState<TypeFilter>("Todos");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creatingBookcase, setCreatingBookcase] = useState(false);

 const filtered = useMemo(() => {
    const base = works.filter((w) => {
      if (mode !== "Todos" && MODE_OF_TYPE[w.type] !== mode) return false;
      if (tab !== "Todos" && w.status !== tab) return false;
      if (type !== "Todos" && w.type !== type) return false;
      if (groupStatuses && !(groupStatuses as readonly Status[]).includes(w.status)) return false;
      return true;
    });
    return applyFilters(base, filters);
  }, [works, mode, tab, type, filters, groupStatuses]);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const chunked: (typeof filtered)[] = [];
    for (let i = 0; i < filtered.length; i += 2) {
      chunked.push(filtered.slice(i, i + 2));
    }
    return chunked;
  }, [filtered]);

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 260,
    overscan: 6,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="w-6" />
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Biblioteca
        </h1>
        <button
          type="button"
          aria-label="Filtrar"
          onClick={() => setSheetOpen(true)}
        >
          <Filter size={20} color="var(--fan-text-2)" />
        </button>
      </header>

     {/* ── Nível 1: MODO de consumo — separação definitiva Ler/Assistir/Jogar/Ouvir ── */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: "none" }}>
        {MODE_TABS.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onPointerDown={() => {
                setMode(m);
                setTab("Todos");
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition"
              style={{
                background: active ? "var(--fan-pink)" : "var(--fan-bg-2)",
                color: active ? "white" : "var(--fan-text-2)",
                border: active ? "none" : "1px solid var(--fan-border)",
              }}
            >
              {m !== "Todos" && <ModeIcon mode={m} size={13} />}
              {m === "Todos" ? "Todos" : MODE_LABELS[m]}
            </button>
          );
        })}
      </div>

      {/* ── Nível 2: sub-abas de status, filtradas pelo modo selecionado acima ── */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
        {statusTabsForMode.map((s) => {
          const active = tab === s;
          return (
            <button
              key={s}
              onPointerDown={() => setTab(s as Status | "Todos")}
              className="text-sm pb-2 whitespace-nowrap relative"
              style={{ color: active ? "var(--fan-pink-light)" : "var(--fan-text-2)", fontWeight: active ? 700 : 500 }}
            >
              {s}
              {active && (
                <span
                  className="absolute left-0 right-0 -bottom-0 h-[2px]"
                  style={{ background: "var(--fan-pink)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {group && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)" }}
          >
            Filtrando: {GROUP_LABELS[group]}
          </span>
          <Link to="/library" search={{}} className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            Limpar
          </Link>
        </div>
      )}

      <TypeChips value={type} onChange={setType} />

      {/* ── Botões de ação rápida ── */}
      <div className="flex gap-3 px-4 mt-3 mb-1">
        <button
          onPointerDown={() => setCreatingBookcase(true)}
          className="flex-1 flex items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
        >
          <BookMarked size={15} color="var(--fan-icon-blue)" />
          Nova estante
        </button>
        <Link
          to="/collections"
          className="flex-1 flex items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-bold"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)", color: "var(--fan-text-2)" }}
        >
          <LayoutGrid size={15} color="var(--fan-text-2)" />
          Ver estantes
          {bookcases.length > 0 && (
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)" }}
            >
              {bookcases.length}
            </span>
          )}
        </Link>
      </div>

      <ClientOnly>
        {worksLoading ? (
          <WorkGridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState icon={BookMarked} title="Nada por aqui ainda." />
        ) : (
          <div
            ref={listRef}
            className="px-4 mt-3"
            style={{ position: "relative", height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="grid grid-cols-2 gap-3 pb-3"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                  }}
                >
                  {row.map((w) => {
                    const pct =
                      w.total > 0
                        ? Math.min(100, (w.current / w.total) * 100)
                        : w.status === "Concluído"
                          ? 100
                          : 0;
                    return (
                      <Link
                        key={w.id}
                        to="/work/$id"
                        params={{ id: w.id }}
                        className="fan-card overflow-hidden block active:scale-95 transition-transform"
                      >
                        <div
                          className="aspect-[2/3] flex items-center justify-center"
                          style={{ background: "var(--fan-border)" }}
                        >
                          {w.cover ? (
                            <img
                              src={w.cover}
                              alt={w.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <MediaIcon type={w.type} size={36} className="opacity-80" />
                          )}
                        </div>
                        <div className="p-2">
                          <div
                            className="text-sm font-bold truncate"
                            style={{ color: "var(--fan-text)" }}
                          >
                            {w.title}
                          </div>
                          <span
                            className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full"
                            style={{ background: "var(--fan-tag)", color: "var(--fan-pink-light)" }}
                          >
                            {w.type}
                          </span>
                          <div
                            className="mt-1.5 h-[3px] rounded-full overflow-hidden"
                            style={{ background: "var(--fan-border)" }}
                          >
                            <div
                              className="h-full"
                              style={{ width: `${pct}%`, background: "var(--fan-pink)" }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </ClientOnly>


      {/* Modal de criar estante */}
      {creatingBookcase && (
        <BookcaseFormModal
          onCancel={() => setCreatingBookcase(false)}
          onCreate={(name, emoji, accent, cover) => {
            addBookcase({
              name,
              emoji,
              accent,
              cover: cover || undefined,
              shelves: [],
              isPublic: false,
            });
            setCreatingBookcase(false);
          }}
        />
      )}

      <FilterSheet
        open={sheetOpen}
        initial={filters}
        onClose={() => setSheetOpen(false)}
        onApply={setFilters}
      />
    </AppShell>
  );
}
