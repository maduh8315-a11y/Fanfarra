// src/lib/api/social.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { FirestoreTransaction, verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";


const NOTIF_COLLECTION = "notifications";
const LIMIT = 40;
const WINDOW_MS = 60_000;

const inputSchema = z.object({
  idToken: z.string().min(1),
  toUids: z.array(z.string().min(1)).min(1).max(300),
  icon: z.enum(["user-plus", "users", "heart", "eye", "message-circle"]),
  text: z.string().min(1).max(300),
});

export interface NotifyManyResult {
  ok: boolean;
  error?: string;
  sent?: number;
}

function randomId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

// Grava uma notificação idêntica para vários usuários de uma vez — usado
// para: pedido de amizade, aceite de amizade, novo seguidor e "amigo/quem
// você segue recomendou uma obra". Roda com a service account (mesmo
// mecanismo de reactions.functions.ts), então ignora as regras do client.
export const notifyManyServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<NotifyManyResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado." };
    }

    const rate = checkRateLimit("notify-many", uid, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de continuar.` };
    }

    const targets = [...new Set(data.toUids)].filter((t) => t !== uid).slice(0, 300);
    if (targets.length === 0) return { ok: true, sent: 0 };

    const tx = await FirestoreTransaction.begin();
    try {
      const writes: any[] = [];
      const now = Date.now();
      targets.forEach((toUid, i) => {
        tx.upsert(
          NOTIF_COLLECTION,
          `n_${now}_${i}_${randomId()}`,
          { uid: toUid, icon: data.icon, text: data.text, ts: now, read: false, pushed: false },
          writes,
        );
      });
      await tx.commit(writes);
      return { ok: true, sent: targets.length };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível enviar as notificações." };
    }
  });

  const broadcastInputSchema = z.object({
  idToken: z.string().min(1),
  icon: z.enum(["pause-circle", "award", "bar-chart", "vote", "check-circle", "calendar-clock", "user-plus", "users", "heart", "eye", "message-circle"]),
  text: z.string().min(1).max(300),
});

// Aviso pra TODO MUNDO — só admin pode chamar (checado aqui dentro, não no client).
export const notifyAllUsersServer = createServerFn({ method: "POST" })
  .inputValidator(broadcastInputSchema)
  .handler(async ({ data }): Promise<NotifyManyResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado." };
    }

    const rate = checkRateLimit("notify-all", uid, 5, WINDOW_MS);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de continuar.` };
    }

    const readTx = await FirestoreTransaction.begin();
    let isAdmin = false;
    let targets: string[] = [];
    try {
      const admins = await readTx.get<{ uids?: string[] }>("app_config", "admins");
      isAdmin = admins.exists && (admins.data.uids ?? []).includes(uid);
      if (isAdmin) {
        const profiles = await readTx.listAll<{ uid?: string }>("public_profiles", 5000);
        targets = profiles.map((p) => p.data.uid || p.id).filter(Boolean);
      }
    } finally {
      await readTx.rollback();
    }

    if (!isAdmin) return { ok: false, error: "Apenas administradores podem enviar avisos gerais." };
    if (targets.length === 0) return { ok: true, sent: 0 };

    const now = Date.now();
    let sent = 0;
    for (let i = 0; i < targets.length; i += 400) {
      const chunk = targets.slice(i, i + 400);
      const chunkTx = await FirestoreTransaction.begin();
      const writes: any[] = [];
      chunk.forEach((toUid, j) => {
        chunkTx.upsert(NOTIF_COLLECTION, `n_${now}_${i}_${j}_${randomId()}`, { uid: toUid, icon: data.icon, text: data.text, ts: now, read: false, pushed: false }, writes);
      });
      await chunkTx.commit(writes);
      sent += chunk.length;
    }
    return { ok: true, sent };
  });