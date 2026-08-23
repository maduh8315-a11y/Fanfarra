// src/lib/api/moderateUser.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  verifyFirebaseIdToken,
  FirestoreTransaction,
  isAdminUidServer,
  setContentAuthorBannedFlag,
} from "@/lib/googleFirestoreRest.server";

const inputSchema = z.object({
  idToken: z.string().min(1),
  targetUid: z.string().min(1),
  action: z.enum(["ban", "suspend", "unban"]),
  suspendMinutes: z.number().positive().max(525600).optional(), // até 1 ano
  reason: z.string().max(300).optional(),
});

export interface ModerateUserResult {
  ok: boolean;
  error?: string;
}

interface RegistryEntry {
  username: string;
  avatar: string | null;
  banned: boolean;
  suspendedUntil: number;
  reason: string;
  actionAt: number;
  actionType: "ban" | "suspend";
}

const REGISTRY_COLLECTION = "app_config";
const REGISTRY_DOC = "banned_users_registry";

export const moderateUserServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<ModerateUserResult> => {
    let adminUid: string;
    try {
      adminUid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Sessão inválida." };
    }
    if (!(await isAdminUidServer(adminUid))) {
      return { ok: false, error: "Acesso restrito a administradores." };
    }
    if (data.action === "suspend" && !data.suspendMinutes) {
      return { ok: false, error: "Informe a duração da suspensão." };
    }
    if (data.targetUid === adminUid) {
      return { ok: false, error: "Você não pode aplicar essa ação em si mesmo." };
    }

    const patch =
      data.action === "ban"
        ? { banned: true, suspendedUntil: 0 }
        : data.action === "suspend"
          ? { banned: false, suspendedUntil: Date.now() + data.suspendMinutes! * 60 * 1000 }
          : { banned: false, suspendedUntil: 0 };

    const tx = await FirestoreTransaction.begin();
    try {
      const writes: any[] = [];
      tx.upsert("public_profiles", data.targetUid, patch, writes, Object.keys(patch));

      const logId = `${data.targetUid}_${Date.now()}`;
      tx.upsert(
        "moderation_actions",
        logId,
        {
          targetUid: data.targetUid,
          adminUid,
          action: data.action,
          suspendMinutes: data.suspendMinutes ?? null,
          reason: data.reason ?? "",
          createdAt: Date.now(),
        },
        writes,
      );

      // Mantém um "índice" simples de quem está banido/suspenso agora,
      // atualizado na mesma transação — evita ter que fazer uma busca
      // pesada no Firestore só pra montar a tela de admin depois.
      const registry = await tx.get<{ entries?: Record<string, RegistryEntry> }>(REGISTRY_COLLECTION, REGISTRY_DOC);
      const entries = { ...(registry.data.entries ?? {}) };

      if (data.action === "unban") {
        delete entries[data.targetUid];
      } else {
        const targetProfile = await tx.get<{ username?: string; avatar?: string }>(
          "public_profiles",
          data.targetUid,
        );
        entries[data.targetUid] = {
          username: targetProfile.data.username ?? data.targetUid,
          avatar: targetProfile.data.avatar ?? null,
          banned: data.action === "ban",
          suspendedUntil: patch.suspendedUntil,
          reason: data.reason ?? "",
          actionAt: Date.now(),
          actionType: data.action,
        };
      }
      tx.upsert(REGISTRY_COLLECTION, REGISTRY_DOC, { entries }, writes, ["entries"]);

      await tx.commit(writes);

      // Esconde (ou revela) o conteúdo já publicado por essa conta. Feito
      // fora da transação principal porque uma conta pode ter mais posts
      // do que o limite de escritas de uma transação. Se isso falhar, o
      // ban/unban em si já foi aplicado acima — só loga o erro, sem
      // desfazer a ação principal por causa disso.
      try {
        await setContentAuthorBannedFlag(data.targetUid, data.action !== "unban");
      } catch (err) {
        console.error("Falha ao atualizar authorBanned no conteúdo do usuário:", err);
      }

      return { ok: true };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível aplicar a ação. Tente novamente." };
    }
  });