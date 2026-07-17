// src/lib/api/reactions.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { FirestoreTransaction, verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";

const REACTIONS_COLLECTION = "rec_reactions";
const COUNTS_COLLECTION = "rec_reaction_counts";
const MAX_REACTIONS_PER_CATEGORY = 5;

// Máx. 15 reações a cada 10s, por usuário (substitui o cooldown que só
// existia no client — aquele continua servindo pra UX, mas quem PROTEGE
// de verdade agora é este limite aqui).
const LIMIT = 15;
const WINDOW_MS = 10_000;

function slugifyReactionType(type: string): string {
  return type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

const inputSchema = z.object({
  idToken: z.string().min(1),
  itemId: z.string().min(1),
  itemType: z.string().min(1),
  reaction: z.enum(["like", "boo"]),
});

export interface ReactToRecItemResult {
  ok: boolean;
  error?: string;
  reaction?: "like" | "boo" | null;
  likes?: number;
  boos?: number;
}

export const reactToRecItemServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<ReactToRecItemResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado para reagir." };
    }

    const rate = checkRateLimit("rec-reaction", uid, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de reagir de novo.` };
    }

    const typeSlug = slugifyReactionType(data.itemType);
    const reactionDocId = `${data.itemId}__${uid}`;

    const tx = await FirestoreTransaction.begin();
    try {
      const [reactionSnap, countsSnap] = await Promise.all([
        tx.get<{ reaction?: "like" | "boo" }>(REACTIONS_COLLECTION, reactionDocId),
        tx.get<{ likes?: number; boos?: number }>(COUNTS_COLLECTION, data.itemId),
      ]);

      const previous = reactionSnap.exists ? reactionSnap.data.reaction ?? null : null;

      // Só checa o limite quando está ENTRANDO numa reação nova nessa
      // direção (mesma regra de antes: trocar/remover a própria reação
      // num item já contado não conta como uma obra a mais).
      if (previous !== data.reaction) {
        const distinctCount = await tx.countWhereEquals(
          REACTIONS_COLLECTION,
          { uid, reaction: data.reaction, type: typeSlug },
          MAX_REACTIONS_PER_CATEGORY + 1,
        );
        if (distinctCount >= MAX_REACTIONS_PER_CATEGORY) {
          await tx.rollback();
          const label = data.reaction === "like" ? "aplaudir" : "vaiar";
          return { ok: false, error: `Você já pode ${label} no máximo ${MAX_REACTIONS_PER_CATEGORY} obras nesta categoria.` };
        }
      }

      let likes = countsSnap.exists ? (countsSnap.data.likes ?? 0) : 0;
      let boos = countsSnap.exists ? (countsSnap.data.boos ?? 0) : 0;

      const writes: any[] = [];
      let newReaction: "like" | "boo" | null;

      if (previous === data.reaction) {
        if (data.reaction === "like") likes = Math.max(0, likes - 1);
        else boos = Math.max(0, boos - 1);
        tx.del(REACTIONS_COLLECTION, reactionDocId, writes);
        newReaction = null;
      } else {
        if (previous === "like") likes = Math.max(0, likes - 1);
        if (previous === "boo") boos = Math.max(0, boos - 1);
        if (data.reaction === "like") likes += 1;
        else boos += 1;
        tx.upsert(
          REACTIONS_COLLECTION,
          reactionDocId,
          { itemId: data.itemId, uid, reaction: data.reaction, type: typeSlug, createdAt: Date.now() },
          writes,
        );
        newReaction = data.reaction;
      }

      tx.upsert(COUNTS_COLLECTION, data.itemId, { likes, boos }, writes);
      await tx.commit(writes);

      return { ok: true, reaction: newReaction, likes, boos };
    } catch (err) {
      await tx.rollback();
      return { ok: false, error: "Não foi possível registrar sua reação. Tente novamente." };
    }
  });