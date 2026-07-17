import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type CSSProperties } from "react";
import { AppShell } from "@/components/fanfarra/AppShell";
import {
  useBookcases,
  useBookcasesHasMore,
  useBookcasesLoadingMore,
  loadMoreBookcases,
  addBookcase,
  addShelf,
  deleteBookcase,
  deleteShelf,
  updateShelf as updateShelfStore,
  type Shelf,
} from "@/lib/fanfarra/bookcaseStore";
import { useWorks } from "@/lib/fanfarra/store";
import { useIsPro } from "@/lib/fanfarra/config";
import { InnerHeader } from "./collections/InnerHeader";
import { Level2 } from "./collections/Level2";
import { Level3 } from "./collections/Level3";
import { BookcaseFormModal } from "./collections/BookcaseFormModal";
import { totalWorksInBookcase } from "./collections/helpers";
import { C, grid2, cardBase } from "./collections/styles";

export const Route = createFileRoute("/collections")({
  head: () => ({ meta: [{ title: "Estantes — Fanfarra" }] }),
  component: CollectionsPage,
});

// Reexportado para manter compatibilidade com quem importava
// BookcaseFormModal diretamente de "@/routes/collections" (ex: library.tsx)
export { BookcaseFormModal };

// ─── Componente principal ─────────────────────────────────────────────────────
function CollectionsPage() {
  const nav = useNavigate();
  const bookcases = useBookcases();
  const hasMoreBookcases = useBookcasesHasMore();
  const loadingMoreBookcases = useBookcasesLoadingMore();
  const allWorks = useWorks();
  const isPro = useIsPro();

  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [bookcaseId, setBookcaseId] = useState<string | null>(null);
  const [shelfId, setShelfId] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [showNewBookcase, setShowNewBookcase] = useState(false);

  const currentBookcase = bookcases.find((b) => b.id === bookcaseId) ?? null;
  const currentShelf = currentBookcase?.shelves.find((s) => s.id === shelfId) ?? null;

  // animação de fade ao mudar de nível
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [level]);

  const go = (lvl: 1 | 2 | 3) => {
    setVisible(false);
    setTimeout(() => setLevel(lvl), 150);
  };

  const fadeStyle: CSSProperties = {
    opacity: visible ? 1 : 0,
    transition: "opacity 150ms ease",
  };

  // obras reais de uma prateleira
  const worksForShelf = (shelf: Shelf) => {
    const ids = new Set(shelf.workIds);
    return allWorks.filter((w) => ids.has(w.id));
  };

  return (
    <AppShell>
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.white,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          paddingBottom: 80,
        }}
      >
        {/* ── Nível 1: Lista de estantes ── */}
        {level === 1 && (
          <>
            <InnerHeader title="Minhas Estantes" onAdd={() => setShowNewBookcase(true)} />
            <div style={{ ...grid2, padding: 16, ...fadeStyle }}>
              {bookcases.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    color: C.muted,
                    textAlign: "center",
                    padding: 40,
                  }}
                >
                  Nenhuma estante ainda. Toque em + para criar.
                </div>
              )}
              {bookcases.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBookcaseId(b.id);
                    go(2);
                  }}
                  style={{
                    ...cardBase,
                    padding: 0,
                    overflow: "hidden",
                    textAlign: "left",
                    cursor: "pointer",
                    color: C.white,
                    border: "none",
                    borderTop: `4px solid ${b.accent ?? C.pink}`,
                    display: "block",
                    width: "100%",
                  }}
                >
                  <div style={{ padding: 14 }}>
                    {b.cover ? (
                      <div
                        style={{
                          width: "100%",
                          height: 64,
                          borderRadius: 8,
                          overflow: "hidden",
                          marginBottom: 10,
                        }}
                      >
                        <img
                          src={b.cover}
                          alt={b.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: 32, lineHeight: 1 }}>{b.emoji ?? "🗂️"}</div>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 10 }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                      {b.shelves.length} prateleiras · {totalWorksInBookcase(b, allWorks)} obras
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {hasMoreBookcases && (
              <div style={{ padding: "0 16px 16px", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={loadMoreBookcases}
                  disabled={loadingMoreBookcases}
                  style={{
                    borderRadius: 999,
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 700,
                    background: C.card,
                    border: `1px solid ${C.pink}`,
                    color: C.pinkLight,
                    opacity: loadingMoreBookcases ? 0.6 : 1,
                  }}
                >
                  {loadingMoreBookcases ? "Carregando..." : "Carregar mais"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Nível 2: Prateleiras da estante ── */}
        {level === 2 && currentBookcase && (
          <Level2
            bookcase={currentBookcase}
            fadeStyle={fadeStyle}
            onBack={() => go(1)}
            onOpen={(id) => {
              setShelfId(id);
              go(3);
            }}
            onAddShelf={(name, emoji, accent, cover) =>
              addShelf(currentBookcase.id, {
                name,
                emoji,
                accent,
                cover: cover || undefined,
                mode: "manual",
                workIds: [],
              })
            }
            onRename={(sid, name) => updateShelfStore(currentBookcase.id, sid, { name })}
            onDelete={(sid) => {
              deleteShelf(currentBookcase.id, sid);
            }}
            onDeleteBookcase={() => {
              deleteBookcase(currentBookcase.id);
              go(1);
            }}
          />
        )}

        {/* ── Nível 3: Obras da prateleira ── */}
        {level === 3 && currentShelf && (
          <Level3
            shelf={currentShelf}
            works={worksForShelf(currentShelf)}
            fadeStyle={fadeStyle}
            onBack={() => go(2)}
            onNavigateToWork={(id) => nav({ to: "/work/$id", params: { id } })}
          />
        )}

        {/* ── Modal nova estante ── */}
      {showNewBookcase && (
          <BookcaseFormModal
            showPublicToggle
            isPro={isPro}
            onCancel={() => setShowNewBookcase(false)}
            onCreate={(name, emoji, accent, cover, isPublic) => {
              try {
                addBookcase({
                  name,
                  emoji,
                  accent,
                  cover: cover || undefined,
                  shelves: [],
                  isPublic,
                });
                setShowNewBookcase(false);
              } catch (err) {
                alert(err instanceof Error ? err.message : "Erro ao criar estante.");
              }
            }}
          />
        )}
      </div>
    </AppShell>
  );
}