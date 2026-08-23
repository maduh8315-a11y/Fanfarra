// src/lib/api/reportContent.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { FirestoreTransaction, verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";

const REPORTS_COLLECTION = "content_reports";

// Máx. 5 denúncias a cada 10 minutos, por usuário — dá pra denunciar várias
// coisas de verdade, mas trava automação/abuso.
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

export const inputSchema = z.object({
  idToken: z.string().min(1),
  contentType: z.enum(["recommendation", "comment", "profile"]),
  contentId: z.string().min(1),
  reason: z.string().min(1).max(120),
  details: z.string().max(500).optional(),
});

export interface ReportContentResult {
  ok: boolean;
  error?: string;
}

// O ID que a TELA usa pra recomendações postadas pela comunidade vem com
// o prefixo "community_" na frente (ex.: "community_abc123"), mas o
// documento no Firestore, dentro de "communityRecs", é salvo só como
// "abc123". Precisamos tirar o prefixo antes de procurar o documento.
function stripCommunityPrefix(id: string): string {
  return id.startsWith("community_") ? id.slice("community_".length) : id;
}

export const reportContentServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<ReportContentResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado para denunciar." };
    }

    const rate = checkRateLimit("report-content", uid, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de denunciar de novo.` };
    }

    const tx = await FirestoreTransaction.begin();
    try {
      // Busca dados do conteúdo denunciado — autor, título e tipo da obra —
      // pra guardar junto da denúncia. Assim o painel admin mostra tudo
      // sem precisar de mais consultas depois.
      let targetAuthorUid: string | undefined;
      let targetAuthorUsername: string | undefined;
      let targetTitle: string | undefined;
      let targetWorkType: string | undefined;

      if (data.contentType === "recommendation") {
        const rawId = stripCommunityPrefix(data.contentId);
        const rec = await tx.get<{ uid?: string; username?: string; title?: string; type?: string }>(
          "communityRecs",
          rawId,
        );
        targetAuthorUid = rec.data.uid;
        targetAuthorUsername = rec.data.username;
        targetTitle = rec.data.title;
        targetWorkType = rec.data.type;
      } else if (data.contentType === "comment") {
        const comment = await tx.get<{ uid?: string; username?: string; text?: string }>(
          "rec_comments",
          data.contentId,
        );
        targetAuthorUid = comment.data.uid;
        targetAuthorUsername = comment.data.username;
      }

      const reportId = `${data.contentType}_${data.contentId}_${uid}_${Date.now()}`;
      const writes: any[] = [];
      tx.upsert(
        REPORTS_COLLECTION,
        reportId,
        {
          contentType: data.contentType,
          contentId: data.contentId,
          reason: data.reason,
          details: data.details ?? "",
          reportedByUid: uid,
          targetAuthorUid: targetAuthorUid ?? "",
          targetAuthorUsername: targetAuthorUsername ?? "",
          targetTitle: targetTitle ?? "",
          targetWorkType: targetWorkType ?? "",
          status: "pending",
          createdAt: Date.now(),
        },
        writes,
      );
      await tx.commit(writes);
      return { ok: true };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível enviar a denúncia. Tente novamente." };
    }
  });