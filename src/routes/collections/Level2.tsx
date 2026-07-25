import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { Bookcase } from "@/lib/fanfarra/bookcaseStore";
import { InnerHeader } from "./InnerHeader";
import { BookcaseFormModal } from "./BookcaseFormModal";
import { C, cardBase, grid2, badge, iconBtn, btnGhost, btnPrimary, overlay, menuStyle, menuItem } from "./styles"
import { toast } from "sonner";;

// ─── Nível 2 ──────────────────────────────────────────────────────────────────
export function Level2({
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
                            toast.error(err instanceof Error ? err.message : "Erro ao criar prateleira.");
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