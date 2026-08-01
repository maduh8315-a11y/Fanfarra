// src/lib/api/chat.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { FirestoreTransaction, verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";

const CHATS_COLLECTION = "chats";
const FRIENDSHIPS_COLLECTION = "friendships";
const BLOCKS_COLLECTION = "blocks";
const NOTIF_COLLECTION = "notifications";

const SEND_LIMIT = 20;
const SEND_WINDOW_MS = 10_000;

function chatIdFor(a: string, b: string): string {
  return [a, b].sort().join("_");
}

function randomId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

const sendInputSchema = z.object({
  idToken: z.string().min(1),
  otherUid: z.string().min(1),
  otherUsername: z.string().min(1),
  myUsername: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export interface SendChatMessageResult {
  ok: boolean;
  error?: string;
}

// Substitui a escrita direta do client em `chats` e `chats/{id}/messages`
// (ver firestore.rules — essas coleções agora são write:false pro client,
// menos a exceção de "marcar como lida"). Roda com a service account, então
// ignora as regras — o rate limit AQUI é quem protege de verdade agora.
export const sendChatMessageServer = createServerFn({ method: "POST" })
  .inputValidator(sendInputSchema)
  .handler(async ({ data }): Promise<SendChatMessageResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado." };
    }

    const trimmed = data.text.trim();
    if (!trimmed) return { ok: false, error: "Mensagem vazia." };

    const rate = checkRateLimit("chat-send", uid, SEND_LIMIT, SEND_WINDOW_MS);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de mandar outra mensagem.` };
    }

    const chatId = chatIdFor(uid, data.otherUid);

    const tx = await FirestoreTransaction.begin();
    try {
      const [friendship, blockedByMe, blockedMe] = await Promise.all([
        tx.get(FRIENDSHIPS_COLLECTION, chatId),
        tx.get(BLOCKS_COLLECTION, `${uid}_${data.otherUid}`),
        tx.get(BLOCKS_COLLECTION, `${data.otherUid}_${uid}`),
      ]);
      if (!friendship.exists) {
        await tx.rollback();
        return { ok: false, error: "Vocês precisam ser amigos para conversar." };
      }
      if (blockedByMe.exists || blockedMe.exists) {
        await tx.rollback();
        return { ok: false, error: "Não é possível enviar mensagem para este usuário." };
      }

      const now = Date.now();
      const writes: any[] = [];

      tx.upsert(
        CHATS_COLLECTION,
        chatId,
        {
          members: [uid, data.otherUid].sort(),
          lastMessage: trimmed,
          lastMessageAt: now,
          lastSenderUid: uid,
          readAt: { [uid]: now },
        },
        writes,
        ["members", "lastMessage", "lastMessageAt", "lastSenderUid", `readAt.${uid}`],
      );

      tx.upsert(
        `${CHATS_COLLECTION}/${chatId}/messages`,
        randomId(),
        { senderUid: uid, senderUsername: data.myUsername, text: trimmed, createdAt: now },
        writes,
      );

      const preview = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
      tx.upsert(
        NOTIF_COLLECTION,
        `n_${now}_${randomId()}`,
        { uid: data.otherUid, icon: "message-circle", text: `${data.myUsername}: ${preview}`, ts: now, read: false, pushed: false },
        writes,
      );

      await tx.commit(writes);
      return { ok: true };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível enviar sua mensagem. Tente novamente." };
    }
  });