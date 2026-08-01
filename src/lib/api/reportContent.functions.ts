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

const inputSchema = z.object({
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