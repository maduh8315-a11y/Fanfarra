// src/lib/api/awardVote.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { FirestoreTransaction, verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";

const NOMINATIONS_COLLECTION = "award_nominations";
const REACTIONS_COLLECTION = "award_reactions";

const LIMIT = 30;
const WINDOW_MS = 10_000;

const inputSchema = z.object({
  idToken: z.string().min(1),
  nominationId: z.string().min(1),
  themeId: z.string().min(1),
  reaction: z.enum(["aplauso", "vaia"]),
});

export interface ReactToNominationResult {
  ok: boolean;
  error?: string;
  applause?: number;
  boos?: number;
}

// Substitui a escrita direta do client em `award_nominations` (contadores)
// e `award_reactions` (create/update) — ver firestore.rules.
export const reactToNominationServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<ReactToNominationResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado." };
    }

    const rate = checkRateLimit("award-vote", uid, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de votar de novo.` };
    }

    const reactionId = `${data.nominationId}__${uid}`;

    const tx = await FirestoreTransaction.begin();
    try {
      const [nomSnap, reactionSnap] = await Promise.all([
        tx.get<{ applause?: number; boos?: number }>(NOMINATIONS_COLLECTION, data.nominationId),
        tx.get<{ reaction?: "aplauso" | "vaia" }>(REACTIONS_COLLECTION, reactionId),
      ]);
      if (!nomSnap.exists) {
        await tx.rollback();
        return { ok: false, error: "Indicação não encontrada." };
      }

      let applause = nomSnap.data.applause ?? 0;
      let boos = nomSnap.data.boos ?? 0;
      const previous = reactionSnap.exists ? reactionSnap.data.reaction ?? null : null;

      const writes: any[] = [];

      if (previous === data.reaction) {
        if (data.reaction === "aplauso") applause = Math.max(0, applause - 1);
        else boos = Math.max(0, boos - 1);
        tx.del(REACTIONS_COLLECTION, reactionId, writes);
      } else {
        if (previous === "aplauso") applause = Math.max(0, applause - 1);
        if (previous === "vaia") boos = Math.max(0, boos - 1);
        if (data.reaction === "aplauso") applause += 1;
        else boos += 1;
        tx.upsert(
          REACTIONS_COLLECTION,
          reactionId,
          { nominationId: data.nominationId, themeId: data.themeId, uid, reaction: data.reaction, createdAt: Date.now() },
          writes,
        );
      }

      tx.upsert(NOMINATIONS_COLLECTION, data.nominationId, { applause, boos }, writes);
      await tx.commit(writes);
      return { ok: true, applause, boos };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível registrar seu voto. Tente novamente." };
    }
  });