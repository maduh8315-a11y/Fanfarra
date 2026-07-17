import type { CSSProperties } from "react";

export const C = {
  bg: "var(--fan-bg)",
  card: "var(--fan-bg-3)",
  border: "var(--fan-border)",
  pink: "var(--fan-pink)",
  pinkLight: "var(--fan-pink-light)",
  lilac: "var(--fan-text-2)",
  white: "var(--fan-text)",
  muted: "var(--fan-text-2)",
};

export const ACCENTS = ["var(--fan-pink)", "var(--fan-text-2)", "#34D399", "var(--fan-pink-light)", "#F59E0B", "#60A5FA"];
export const EMOJIS = ["🌸", "📋", "✅", "🎬", "📚", "🎮", "🎵", "⭐", "🔥", "💜", "🍿", "🗂️"];

export const cardBase: CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.card,
};

export const grid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

export const badge: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: 999,
};

export const iconBtn: CSSProperties = {
  background: "transparent",
  border: "none",
  color: C.white,
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};

export const inputStyle: CSSProperties = {
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

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: C.muted,
  marginBottom: 8,
};

export const btnPrimary: CSSProperties = {
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

export const btnGhost: CSSProperties = {
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

export const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 50,
};

export const menuStyle: CSSProperties = {
  position: "absolute",
  top: 32,
  right: 8,
  ...cardBase,
  background: C.bg,
  zIndex: 20,
  overflow: "hidden",
  minWidth: 160,
};

export const menuItem: CSSProperties = {
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