import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { C, ACCENTS, EMOJIS, cardBase, labelStyle, inputStyle, overlay, btnGhost, btnPrimary } from "./styles";
import { CoverField } from "./CoverField";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useIsPro } from "@/lib/fanfarra/config";

// ─── Modal Nova Estante ───────────────────────────────────────────────────────
export function BookcaseFormModal({
  title = "Nova estante",
  namePlaceholder = "Nome da estante",
  onCancel,
  onCreate,
  showPublicToggle = false,
  isPro: _isProProp = false,
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
  const isOnline = useOnlineStatus();
  const isPro = useIsPro();
  const offlineBlocked = !isOnline && !isPro;
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
          {offlineBlocked && (
          <p
            style={{
              marginTop: 16,
              fontSize: 12,
              color: C.muted,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Lock size={12} /> Criar offline é exclusivo do PRO. Conecte-se à internet ou assine o PRO para continuar.
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button style={btnGhost} onClick={onCancel}>
            Cancelar
          </button>
          <button
            style={{
              ...btnPrimary,
              opacity: offlineBlocked ? 0.5 : 1,
              cursor: offlineBlocked ? "not-allowed" : "pointer",
            }}
            disabled={offlineBlocked}
            onClick={() => {
              if (offlineBlocked) return;
              if (name.trim()) onCreate(name.trim(), emoji, accent, cover, isPro && isPublic);
            }}
          >
            Criar
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}