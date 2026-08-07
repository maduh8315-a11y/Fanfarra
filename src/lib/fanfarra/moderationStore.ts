// src/lib/fanfarra/moderationStore.ts
// Junta as denúncias das duas coleções (content_reports e reports) numa
// lista só, pra alimentar a fila de moderação no painel admin.
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

const CONTENT_REPORTS_COLLECTION = "content_reports";
const PROFILE_REPORTS_COLLECTION = "reports";

export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface ModerationReport {
  id: string;
  // De qual coleção do Firestore essa denúncia veio — precisa pra saber
  // onde escrever de volta quando o admin resolve/descarta.
  collection: typeof CONTENT_REPORTS_COLLECTION | typeof PROFILE_REPORTS_COLLECTION;
  // Rótulo amigável do tipo de conteúdo denunciado.
  kindLabel: string;
  // O que foi denunciado — @username do perfil, ou o id da recomendação/comentário.
  targetLabel: string;
  targetUsername?: string; // só quando dá pra linkar pro perfil público
  reason: string;
  details?: string;
  reportedByUid: string;
  status: ReportStatus;
  createdAt: number;
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

// Escuta as duas coleções em tempo real e devolve tudo junto, mais recente
// primeiro. Use só dentro do painel admin — a leitura precisa estar
// restrita a admins nas regras do Firestore (veja aviso no fim do arquivo).
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
            targetLabel: data.contentId ?? "—",
            reason: data.reason ?? "",
            details: data.details || undefined,
            reportedByUid: data.reportedByUid ?? "",
            status: (data.status as ReportStatus) ?? "pending",
            createdAt: data.createdAt ?? 0,
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
          } satisfies ModerationReport;
        }),
      );
    });
    return () => unsub();
  }, []);

  return [...contentReports, ...profileReports].sort((a, b) => b.createdAt - a.createdAt);
}

export async function setReportStatus(report: ModerationReport, status: ReportStatus): Promise<void> {
  await updateDoc(doc(db, report.collection, report.id), { status });
}

// ⚠️ IMPORTANTE: as regras do Firestore (firestore.rules) precisam
// restringir leitura E escrita das coleções "content_reports" e "reports"
// só pra UIDs admin — senão qualquer usuário logado conseguiria ler ou
// alterar denúncias direto pelo console do navegador. Ex.:
//
// match /content_reports/{id} {
//   allow read, write: if request.auth.uid in ["SEU_UID_ADMIN_AQUI"];
// }
// match /reports/{id} {
//   allow read, write: if request.auth.uid in ["SEU_UID_ADMIN_AQUI"];
// }