// src/lib/api/friendRequest.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { FirestoreTransaction, verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";

const REQUESTS_COLLECTION = "friend_requests";
const FRIENDSHIPS_COLLECTION = "friendships";
const BLOCKS_COLLECTION = "blocks";
const NOTIF_COLLECTION = "notifications";

const LIMIT = 10;
const WINDOW_MS = 60_000;

function pairId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

function randomId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

const inputSchema = z.object({
  idToken: z.string().min(1),
  toUid: z.string().min(1),
  toUsername: z.string().min(1),
  toAvatar: z.string().optional(),
  myUsername: z.string().min(1),
  myAvatar: z.string().optional(),
});

export interface SendFriendRequestResult {
  ok: boolean;
  error?: string;
  autoAccepted?: boolean;
}

// Substitui a escrita direta do client em `friend_requests` (create) — ver
// firestore.rules. accept/decline/cancel continuam no client normalmente,
// só o ENVIO (que é o vetor de spam) passa a ser rate-limited de verdade.
export const sendFriendRequestServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<SendFriendRequestResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado." };
    }
    if (uid === data.toUid) return { ok: false, error: "Você não pode adicionar a si mesmo." };

    const rate = checkRateLimit("friend-request", uid, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de enviar outro pedido.` };
    }

    const tx = await FirestoreTransaction.begin();
    try {
      const [blockedByMe, blockedMe] = await Promise.all([
        tx.get(BLOCKS_COLLECTION, `${uid}_${data.toUid}`),
        tx.get(BLOCKS_COLLECTION, `${data.toUid}_${uid}`),
      ]);
      if (blockedByMe.exists || blockedMe.exists) {
        await tx.rollback();
        return { ok: false, error: "Não é possível enviar pedido de amizade para este usuário." };
      }

      const now = Date.now();
      const writes: any[] = [];
      const reverseId = `${data.toUid}_${uid}`;
      const reverseSnap = await tx.get<{ status?: string }>(REQUESTS_COLLECTION, reverseId);

      if (reverseSnap.exists && reverseSnap.data.status === "pending") {
        // a outra pessoa já chamou primeiro — aceita direto em vez de duplicar
        tx.upsert(REQUESTS_COLLECTION, reverseId, { status: "accepted", updatedAt: now }, writes, ["status", "updatedAt"]);
        tx.upsert(FRIENDSHIPS_COLLECTION, pairId(uid, data.toUid), { members: [uid, data.toUid].sort(), createdAt: now }, writes);
        tx.upsert(
          NOTIF_COLLECTION,
          `n_${now}_${randomId()}`,
          { uid: data.toUid, icon: "users", text: `${data.myUsername} aceitou seu pedido de amizade! Agora vocês são amigos.`, ts: now, read: false, pushed: false },
          writes,
        );
        await tx.commit(writes);
        return { ok: true, autoAccepted: true };
      }

      const id = `${uid}_${data.toUid}`;
      tx.upsert(
        REQUESTS_COLLECTION,
        id,
        {
          fromUid: uid,
          toUid: data.toUid,
          fromUsername: data.myUsername,
          toUsername: data.toUsername,
          ...(data.myAvatar ? { fromAvatar: data.myAvatar } : {}),
          ...(data.toAvatar ? { toAvatar: data.toAvatar } : {}),
          status: "pending",
          createdAt: now,
          updatedAt: now,
        },
        writes,
      );
      tx.upsert(
        NOTIF_COLLECTION,
        `n_${now}_${randomId()}`,
        { uid: data.toUid, icon: "user-plus", text: `${data.myUsername} te enviou um pedido de amizade.`, ts: now, read: false, pushed: false },
        writes,
      );

      await tx.commit(writes);
      return { ok: true, autoAccepted: false };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível enviar o pedido de amizade." };
    }
  });