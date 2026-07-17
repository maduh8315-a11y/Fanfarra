import { ArrowLeft } from "lucide-react";
import { C, iconBtn } from "./styles";

// ─── Header interno ───────────────────────────────────────────────────────────
export function InnerHeader({
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