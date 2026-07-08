import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Filter, Plus, BookMarked, Layers } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { ClientOnly } from "@/components/fanfarra/ClientOnly";
import { TypeChips, type TypeFilter } from "@/components/fanfarra/Chips";
import { useWorks } from "@/lib/fanfarra/store";
import { useBookcases, addBookcase } from "@/lib/fanfarra/bookcaseStore";
import { STATUSES, type Status } from "@/lib/fanfarra/types";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import {
  FilterSheet,
  DEFAULT_FILTERS,
  applyFilters,
  type LibraryFilters,
} from "@/components/fanfarra/FilterSheet";
import { BookcaseFormModal } from "@/routes/collections";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "Biblioteca — Fanfarra" }] }),
  component: LibraryPage,
});

const STATUS_TABS = ["Todos", ...STATUSES] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function LibraryPage() {
  const works = useWorks();
  const bookcases = useBookcases();
  const [tab, setTab] = useState<StatusTab>("Todos");
  const [type, setType] = useState<TypeFilter>("Todos");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creatingBookcase, setCreatingBookcase] = useState(false);

  const filtered = useMemo(() => {
    const base = works.filter((w) => {
      if (tab !== "Todos" && w.status !== (tab as Status)) return false;
      if (type !== "Todos" && w.type !== type) return false;
      return true;
    });
    return applyFilters(base, filters);
  }, [works, tab, type, filters]);

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
          aria-label="Filtrar"
          onPointerDown={(e) => {
            e.preventDefault();
            setSheetOpen(true);
          }}
        >
          <Filter size={20} color="var(--fan-text-2)" />
        </button>
      </header>

      {/* Status tabs */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
        {STATUS_TABS.map((s) => {
          const active = tab === s;
          return (
            <button
              key={s}
              onPointerDown={() => setTab(s)}
              className="text-[12px] pb-2 whitespace-nowrap relative"
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

      <TypeChips value={type} onChange={setType} />

      {/* ── Botões de ação rápida ── */}
      <div className="flex gap-3 px-4 mt-3 mb-1">
        <button
          onPointerDown={() => setCreatingBookcase(true)}
          className="flex-1 flex items-center justify-center gap-2 rounded-[12px] py-3 text-[12px] font-bold"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
        >
          <BookMarked size={15} color="var(--fan-pink)" />
          Nova estante
        </button>
        <Link
          to="/collections"
          className="flex-1 flex items-center justify-center gap-2 rounded-[12px] py-3 text-[12px] font-bold"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)", color: "var(--fan-text-2)" }}
        >
          <Layers size={15} color="var(--fan-text-2)" />
          Ver estantes
          {bookcases.length > 0 && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)" }}
            >
              {bookcases.length}
            </span>
          )}
        </Link>
      </div>

      <ClientOnly>
        {filtered.length === 0 ? (
          <div className="text-center py-20 px-6" style={{ color: "var(--fan-text-2)" }}>
            <p className="text-sm">Nada por aqui ainda.</p>
          </div>
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
                            <MediaIcon type={w.type} size={36} className="opacity-40" />
                          )}
                        </div>
                        <div className="p-2">
                          <div
                            className="text-[11px] font-bold truncate"
                            style={{ color: "var(--fan-text)" }}
                          >
                            {w.title}
                          </div>
                          <span
                            className="inline-block mt-1 text-[8px] px-2 py-0.5 rounded-full"
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

      <Link
        to="/add"
        className="fixed bottom-24 right-4 rounded-full flex items-center justify-center shadow-lg z-30"
        style={{
          background: "var(--fan-pink)",
          width: 52,
          height: 52,
          boxShadow: "0 8px 20px color-mix(in srgb, var(--fan-pink) 40%, transparent)",
        }}
        aria-label="Adicionar obra"
      >
        <Plus size={26} color="white" />
      </Link>

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
