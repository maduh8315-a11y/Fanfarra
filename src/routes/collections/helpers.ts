import type { CSSProperties } from "react";
import type { Bookcase } from "@/lib/fanfarra/bookcaseStore";
import type { Work } from "@/lib/fanfarra/types";
import { C } from "./styles";

// ─── Conta obras numa estante ─────────────────────────────────────────────────
export function totalWorksInBookcase(b: Bookcase, allWorks: Work[]): number {
  const allIds = new Set(b.shelves.flatMap((s) => s.workIds));
  return allIds.size;
}

// ─── Status badge colorido ────────────────────────────────────────────────────
export function statusStyle(status: string): CSSProperties {
  if (["Concluído", "Assistido", "Platinado"].includes(status))
    return { background: "color-mix(in srgb, #34D399 18%, transparent)", color: "#34D399" };
  if (["Pausado"].includes(status))
    return { background: "color-mix(in srgb, #F59E0B 18%, transparent)", color: "#F59E0B" };
  if (["Abandonado"].includes(status))
    return { background: "color-mix(in srgb, #F87171 18%, transparent)", color: "#F87171" };
  return { background: "color-mix(in srgb, var(--fan-pink) 18%, transparent)", color: C.pinkLight };
}