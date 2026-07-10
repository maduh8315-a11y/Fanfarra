import { uploadCoverImage } from "@/lib/fanfarra/uploadImage";
import { ArrowLeft, Trash2, Image as ImageIconLucide, Lock } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo, type CSSProperties } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { AppShell } from "@/components/fanfarra/AppShell";
import {
  useBookcases,
  addBookcase,
  addShelf,
  deleteBookcase,
  deleteShelf,
  updateShelf as updateShelfStore,
  type Bookcase,
  type Shelf,
} from "@/lib/fanfarra/bookcaseStore";
import { useWorks } from "@/lib/fanfarra/store";
import type { Work } from "@/lib/fanfarra/types";
import { useIsPro } from "@/lib/fanfarra/config";

export const Route = createFileRoute("/collections")({
  head: () => ({ meta: [{ title: "Estantes — Fanfarra" }] }),
  component: CollectionsPage,
});

// ─── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  bg: "var(--fan-bg)",
  card: "var(--fan-bg-3)",
  border: "var(--fan-border)",
  pink: "var(--fan-pink)",
  pinkLight: "var(--fan-pink-light)",
  lilac: "var(--fan-text-2)",
  white: "var(--fan-text)",
  muted: "var(--fan-text-2)",
};

const ACCENTS = ["var(--fan-pink)", "var(--fan-text-2)", "#34D399", "var(--fan-pink-light)", "#F59E0B", "#60A5FA"];
const EMOJIS = ["🌸", "📋", "✅", "🎬", "📚", "🎮", "🎵", "⭐", "🔥", "💜", "🍿", "🗂️"];

// ─── Helpers de estilo ────────────────────────────────────────────────────────
const cardBase: CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.card,
};

const grid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const badge: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: 999,
};

const iconBtn: CSSProperties = {
  background: "transparent",
  border: "none",
  color: C.white,
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.white,
  fontSize: 14,
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: C.muted,
  marginBottom: 8,
};

const btnPrimary: CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  border: "none",
  background: C.pink,
  color: C.white,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const btnGhost: CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: "transparent",
  color: C.white,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 50,
};

const menuStyle: CSSProperties = {
  position: "absolute",
  top: 32,
  right: 8,
  ...cardBase,
  background: C.bg,
  zIndex: 20,
  overflow: "hidden",
  minWidth: 160,
};

const menuItem: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 14px",
  background: "transparent",
  border: "none",
  color: C.white,
  cursor: "pointer",
  fontSize: 14,
};

// ─── Conta obras numa estante ─────────────────────────────────────────────────
function totalWorksInBookcase(b: Bookcase, allWorks: Work[]): number {
  const allIds = new Set(b.shelves.flatMap((s) => s.workIds));
  return allIds.size;
}

// ─── Status badge colorido ────────────────────────────────────────────────────
function statusStyle(status: string): CSSProperties {
  if (["Concluído", "Assistido", "Platinado"].includes(status))
    return { background: "color-mix(in srgb, #34D399 18%, transparent)", color: "#34D399" };
  if (["Pausado"].includes(status))
    return { background: "color-mix(in srgb, #F59E0B 18%, transparent)", color: "#F59E0B" };
  if (["Abandonado"].includes(status))
    return { background: "color-mix(in srgb, #F87171 18%, transparent)", color: "#F87171" };
  return { background: "color-mix(in srgb, var(--fan-pink) 18%, transparent)", color: C.pinkLight };
}

// ─── Header interno ───────────────────────────────────────────────────────────
function InnerHeader({
  title,
  onBack,
  onAdd,
}: {
  title: string;
  onBack?: () => void;
  onAdd?: () => void;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ width: 40 }}>
        {onBack && (
          <button onClick={onBack} style={iconBtn} aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
        )}
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, textAlign: "center" }}>{title}</h1>
      <div style={{ width: 40, textAlign: "right" }}>
        {onAdd && (
          <button onClick={onAdd} style={{ ...iconBtn, color: C.pink }} aria-label="Adicionar">
            +
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
function CollectionsPage() {
  const nav = useNavigate();
  const bookcases = useBookcases();
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
  const worksForShelf = (shelf: Shelf): Work[] => {
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

// ─── Nível 2 ──────────────────────────────────────────────────────────────────
function Level2({
  bookcase,
  fadeStyle,
  onBack,
  onOpen,
  onAddShelf,
  onRename,
  onDelete,
  onDeleteBookcase,
}: {
  bookcase: Bookcase;
  fadeStyle: CSSProperties;
  onBack: () => void;
  onOpen: (id: string) => void;
  onAddShelf: (name: string, emoji: string, accent: string, cover: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDeleteBookcase: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const [showDeleteBookcase, setShowDeleteBookcase] = useState(false);

  return (
    <>
      <InnerHeader title={bookcase.name} onBack={onBack} onAdd={() => setAdding(true)} />

      {/* Botão excluir estante */}
      <div style={{ padding: "8px 16px 0", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowDeleteBookcase(true)}
          style={{
            ...btnGhost,
            flex: "none",
            padding: "6px 14px",
            fontSize: 12,
            color: "#F87171",
            borderColor: "#3A0000",
          }}
        >
          <span className="inline-flex items-center gap-1.5"><Trash2 size={13} /> Excluir estante</span>
        </button>
      </div>

      {/* Modal adicionar prateleira */}
      {adding && (
        <BookcaseFormModal
          title="Nova prateleira"
          namePlaceholder="Nome da prateleira"
          onCancel={() => setAdding(false)}
          onCreate={(name, emoji, accent, cover) => {
            try {
              onAddShelf(name, emoji, accent, cover);
              setAdding(false);
            } catch (err) {
              alert(err instanceof Error ? err.message : "Erro ao criar prateleira.");
            }
          }}
        />
      )}

      {/* Grid de prateleiras */}
      <div style={{ ...grid2, padding: 16, ...fadeStyle }}>
        {bookcase.shelves.length === 0 && (
          <div style={{ gridColumn: "1 / -1", color: C.muted, textAlign: "center", padding: 40 }}>
            Nenhuma prateleira. Toque em + para criar.
          </div>
        )}
        {bookcase.shelves.map((s) => (
          <div
            key={s.id}
            style={{
              ...cardBase,
              padding: 14,
              position: "relative",
              borderTop: `4px solid ${s.accent ?? C.pink}`,
            }}
          >
            <button
              onClick={() => onOpen(s.id)}
              style={{
                background: "transparent",
                border: "none",
                color: C.white,
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
                padding: 0,
              }}
            >
              <div style={{ fontSize: 26 }}>
                {s.cover ? (
                  <div
                    style={{
                      width: "100%",
                      height: 48,
                      borderRadius: 8,
                      overflow: "hidden",
                      marginBottom: 4,
                    }}
                  >
                    <img
                      src={s.cover}
                      alt={s.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  (s.emoji ?? "🗂️")
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, paddingRight: 20 }}>
                {s.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <span
                  style={{
                    ...badge,
                    background: s.mode === "auto" ? "color-mix(in srgb, #A78BFA 18%, transparent)" : "color-mix(in srgb, var(--fan-pink) 18%, transparent)",
                    color: s.mode === "auto" ? "#A78BFA" : C.pinkLight,
                  }}
                >
                  {s.mode}
                </span>
                <span style={{ fontSize: 12, color: C.muted }}>{s.workIds.length} obras</span>
              </div>
            </button>
            {/* Menu de opções da prateleira */}
            <button
              onClick={() => setMenuId(menuId === s.id ? null : s.id)}
              style={{ ...iconBtn, position: "absolute", top: 8, right: 8, fontSize: 18 }}
              aria-label="Opções"
            >
              ⋯
            </button>
            {menuId === s.id && (
              <div style={menuStyle}>
                <button
                  style={menuItem}
                  onClick={() => {
                    const name = window.prompt("Novo nome da prateleira", s.name);
                    if (name && name.trim()) onRename(s.id, name.trim());
                    setMenuId(null);
                  }}
                >
                  Renomear
                </button>
                <button
                  style={{ ...menuItem, color: C.pink }}
                  onClick={() => {
                    onDelete(s.id);
                    setMenuId(null);
                  }}
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirmação excluir estante */}
      {showDeleteBookcase && (
        <div style={overlay} onClick={() => setShowDeleteBookcase(false)}>
          <div
            style={{ ...cardBase, padding: 20, width: "100%", maxWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>Excluir estante?</h2>
            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 20px" }}>
              As prateleiras serão removidas, mas as obras ficam na sua biblioteca.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnGhost} onClick={() => setShowDeleteBookcase(false)}>
                Cancelar
              </button>
              <button style={{ ...btnPrimary, background: "#CC0022" }} onClick={onDeleteBookcase}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Nível 3 ──────────────────────────────────────────────────────────────────
function Level3({
  shelf,
  works,
  fadeStyle,
  onBack,
  onNavigateToWork,
}: {
  shelf: Shelf;
  works: Work[];
  fadeStyle: CSSProperties;
  onBack: () => void;
  onNavigateToWork: (id: string) => void;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useWindowVirtualizer({
    count: works.length,
    estimateSize: () => 92,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  return (
    <>
      <InnerHeader title={shelf.name} onBack={onBack} />
      <div
        ref={listRef}
        style={{
          padding: 16,
          position: "relative",
          height: rowVirtualizer.getTotalSize(),
          ...fadeStyle,
        }}
      >
        {works.length === 0 && (
          <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>
            Nenhuma obra nesta prateleira.
          </div>
        )}
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const w = works[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 16,
                right: 16,
                paddingBottom: 12,
                transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
              }}
            >
              <div
                style={{
                  ...cardBase,
                  padding: 12,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* capa placeholder */}
                <div
                  style={{
                    width: 40,
                    height: 56,
                    borderRadius: 6,
                    background: w.cover ?? C.border,
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                  onClick={() => onNavigateToWork(w.id)}
                />
                <div
                  style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  onClick={() => onNavigateToWork(w.id)}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {w.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ ...badge, background: C.border, color: C.lilac }}>{w.type}</span>
                    <span style={{ ...badge, ...statusStyle(w.status) }}>{w.status}</span>
                  </div>
                </div>
                {/* menu ⋯ */}
                <button
                  onClick={() => setMenuId(menuId === w.id ? null : w.id)}
                  style={{ ...iconBtn, fontSize: 18 }}
                  aria-label="Opções"
                >
                  ⋯
                </button>
                {menuId === w.id && (
                  <div style={{ ...menuStyle, top: 40 }}>
                    <button
                      style={menuItem}
                      onClick={() => {
                        onNavigateToWork(w.id);
                        setMenuId(null);
                      }}
                    >
                      Ver detalhes
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Campo de upload de capa ──────────────────────────────────────────────────
function CoverField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadCoverImage(file, "bookcases");
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.bg,
            border: `1px solid ${C.border}`,
            flexShrink: 0,
            cursor: uploading ? "default" : "pointer",
          }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          {uploading ? (
            <span style={{ fontSize: 11 }}>⏳</span>
          ) : value ? (
            <img
              src={value}
              alt="Capa"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
           <ImageIconLucide size={20} color={C.muted} />
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            style={{
              ...btnGhost,
              flex: "none",
              padding: "8px 10px",
              fontSize: 12,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "Enviando..." : value ? "Trocar imagem" : "Escolher imagem"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#F87171",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
              }}
            >
              Remover capa
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </div>
      {error && <span style={{ color: "#F87171", fontSize: 11 }}>{error}</span>}
    </div>
  );
}
// ─── Modal Nova Estante ───────────────────────────────────────────────────────
export function BookcaseFormModal({
  title = "Nova estante",
  namePlaceholder = "Nome da estante",
  onCancel,
  onCreate,
  showPublicToggle = false,
  isPro = false,
}: {
  title?: string;
  namePlaceholder?: string;
  onCancel: () => void;
  onCreate: (
    name: string,
    emoji: string,
    accent: string,
    cover: string,
    isPublic: boolean,
  ) => void;
  showPublicToggle?: boolean;
  isPro?: boolean;
}) {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [cover, setCover] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  return (
    <div style={overlay} onClick={onCancel}>
      <div
        style={{
          ...cardBase,
          padding: 20,
          width: "100%",
          maxWidth: 360,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>{title}</h2>

        <label style={labelStyle}>Nome</label>
        <input
          autoFocus
          placeholder={namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>Capa (opcional)</label>
        <CoverField value={cover} onChange={setCover} />

        <label style={{ ...labelStyle, marginTop: 16 }}>Emoji</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              style={{
                ...cardBase,
                fontSize: 20,
                padding: 6,
                cursor: "pointer",
                border: `1px solid ${emoji === e ? C.pink : C.border}`,
                background: emoji === e ? "var(--fan-active-chip)" : C.card,
              }}
            >
              {e}
            </button>
          ))}
        </div>

        <label style={{ ...labelStyle, marginTop: 16 }}>Cor de destaque</label>
        <div style={{ display: "flex", gap: 10 }}>
          {ACCENTS.map((a) => (
            <button
              key={a}
              onClick={() => setAccent(a)}
              aria-label={`Cor ${a}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: a,
                cursor: "pointer",
                border: accent === a ? "3px solid #FFFFFF" : `1px solid ${C.border}`,
              }}
            />
          ))}
        </div>

{showPublicToggle && (
          <div
            onClick={() => {
              if (!isPro) {
                nav({ to: "/pro" });
                return;
              }
              setIsPublic((v) => !v);
            }}
            style={{
              ...cardBase,
              marginTop: 16,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              opacity: isPro ? 1 : 0.7,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fan-text)" }}>
                Tornar pública {!isPro && <Lock size={11} style={{ display: "inline", verticalAlign: "middle" }} />}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>
                Outros usuários poderão ver e seguir essa estante
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 999,
                background: isPro && isPublic ? C.pink : "var(--fan-border)",
                color: isPro && isPublic ? "#fff" : "var(--fan-pink-light)",
              }}
            >
              {isPro ? (isPublic ? "ATIVO" : "OFF") : "PRO"}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button style={btnGhost} onClick={onCancel}>
            Cancelar
          </button>
          <button
            style={btnPrimary}
            onClick={() => {
              if (name.trim()) onCreate(name.trim(), emoji, accent, cover, isPro && isPublic);
            }}
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
