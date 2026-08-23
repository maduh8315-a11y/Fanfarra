// src/lib/fanfarra/moderationStore.ts
// Junta as denúncias das duas coleções (content_reports e reports) numa
// lista só, pra alimentar a fila de moderação no painel admin.
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

const CONTENT_REPORTS_COLLECTION = "content_reports";
const PROFILE_REPORTS_COLLECTION = "reports";

export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface ModerationReport {
  id: string;
  collection: typeof CONTENT_REPORTS_COLLECTION | typeof PROFILE_REPORTS_COLLECTION;
  kindLabel: string;
  targetLabel: string;
  targetUsername?: string;
  reason: string;
  details?: string;
  reportedByUid: string;
  status: ReportStatus;
  createdAt: number;
  // UID de quem AUTOROU o conteúdo denunciado (não é quem denunciou) —
  // usado pros botões de suspender/banir.
  targetAuthorUid?: string;
  contentType?: "recommendation" | "comment" | "profile";
  contentId?: string;
  // Título e tipo (Filme/Livro/Anime/Série...) da obra denunciada.
  targetTitle?: string;
  targetWorkType?: string;
}

function kindLabelFor(contentType?: string): string {
  switch (contentType) {
    case "recommendation":
      return "Recomendação";
    case "comment":
      return "Comentário";
    case "profile":
      return "Perfil";
    default:
      return "Perfil";
  }
}

// Rota da obra denunciada (pra dar um "Ver obra" no painel), ou null
// quando a denúncia não é sobre uma obra (ex.: perfil).
export function reportContentLink(r: ModerationReport): string | null {
  if (r.contentType === "recommendation" && r.contentId) {
    return `/rec/${r.contentId}`;
  }
  return null;
}

export function useModerationReports(): ModerationReport[] {
  const [contentReports, setContentReports] = useState<ModerationReport[]>([]);
  const [profileReports, setProfileReports] = useState<ModerationReport[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, CONTENT_REPORTS_COLLECTION), (snap) => {
      setContentReports(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            collection: CONTENT_REPORTS_COLLECTION,
            kindLabel: kindLabelFor(data.contentType),
            targetLabel: data.targetTitle || data.contentId || "—",
            targetUsername: data.targetAuthorUsername || undefined,
            reason: data.reason ?? "",
            details: data.details || undefined,
            reportedByUid: data.reportedByUid ?? "",
            status: (data.status as ReportStatus) ?? "pending",
            createdAt: data.createdAt ?? 0,
            targetAuthorUid: data.targetAuthorUid || undefined,
            contentType: data.contentType,
            contentId: data.contentId,
            targetTitle: data.targetTitle || undefined,
            targetWorkType: data.targetWorkType || undefined,
          } satisfies ModerationReport;
        }),
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, PROFILE_REPORTS_COLLECTION), (snap) => {
      setProfileReports(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            collection: PROFILE_REPORTS_COLLECTION,
            kindLabel: "Perfil",
            targetLabel: data.targetUsername ? `@${data.targetUsername}` : (data.targetUid ?? "—"),
            targetUsername: data.targetUsername || undefined,
            reason: data.reason ?? "",
            reportedByUid: data.reporterUid ?? "",
            status: (data.status as ReportStatus) ?? "pending",
            createdAt: data.createdAt ?? 0,
            targetAuthorUid: data.targetUid || undefined,
            contentType: "profile",
          } satisfies ModerationReport;
        }),
      );
    });
    return () => unsub();
  }, []);

  return [...contentReports, ...profileReports].sort((a, b) => b.createdAt - a.createdAt);
}


// Quantas denúncias (pendentes ou não) existem sobre o MESMO alvo — mesmo
// conteúdo (contentId) ou mesmo autor (targetAuthorUid). Ajuda o admin a
// perceber se é um padrão (autor problemático / conteúdo real) ou uma
// denúncia isolada/possível perseguição.
export function countSimilarReports(report: ModerationReport, allReports: ModerationReport[]): number {
  return allReports.filter((r) => {
    if (r.id === report.id) return false;
    if (report.contentId && r.contentId === report.contentId) return true;
    if (report.targetAuthorUid && r.targetAuthorUid === report.targetAuthorUid) return true;
    return false;
  }).length;
}

// ⚠️ IMPORTANTE: as regras do Firestore (firestore.rules) precisam
// restringir leitura E escrita das coleções "content_reports" e "reports"
// só pra UIDs admin.