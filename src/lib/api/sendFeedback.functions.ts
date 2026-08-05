// src/lib/api/sendFeedback.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { FirestoreTransaction, verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";

const FEEDBACK_COLLECTION = "feedback";

// Máx. 3 feedbacks a cada 10 minutos, por usuário — evita spam sem
// atrapalhar quem realmente quer mandar vários relatos.
const LIMIT = 3;
const WINDOW_MS = 10 * 60 * 1000;

const inputSchema = z.object({
  idToken: z.string().min(1),
  type: z.enum(["bug", "sugestao", "outro"]),
  message: z.string().min(5).max(1000),
});

export interface SendFeedbackResult {
  ok: boolean;
  error?: string;
}

export const sendFeedbackServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<SendFeedbackResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado para enviar feedback." };
    }

    const rate = checkRateLimit("send-feedback", uid, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de enviar de novo.` };
    }

    const tx = await FirestoreTransaction.begin();
    try {
      const feedbackId = `${uid}_${Date.now()}`;
      const writes: any[] = [];
      tx.upsert(
        FEEDBACK_COLLECTION,
        feedbackId,
        {
          uid,
          type: data.type,
          message: data.message,
          status: "pending",
          createdAt: Date.now(),
        },
        writes,
      );
      await tx.commit(writes);
      return { ok: true };
    } catch (err) {
      console.error("Erro ao salvar feedback:", err);
      return { ok: false, error: "Não foi possível enviar. Tente novamente." };
    }
  });