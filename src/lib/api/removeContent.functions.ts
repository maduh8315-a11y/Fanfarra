// src/lib/api/removeContent.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyFirebaseIdToken, FirestoreTransaction, isAdminUidServer } from "@/lib/googleFirestoreRest.server";



const COLLECTION_BY_TYPE: Record<string, string> = {
  recommendation: "communityRecs",
  comment: "rec_comments",
};

function stripCommunityPrefix(id: string): string {
  return id.startsWith("community_") ? id.slice("community_".length) : id;
}

const inputSchema = z.object({
  idToken: z.string().min(1),
  contentType: z.enum(["recommendation", "comment"]),
  contentId: z.string().min(1),
  reason: z.string().max(300).optional(),
  // Opcional: se vier preenchido, marca a denúncia como resolvida no MESMO
  // passo — evita uma segunda chamada do navegador que dependeria das
  // regras do Firestore (é isso que causava o erro de permissão).
  reportCollection: z.enum(["content_reports", "reports"]).optional(),
  reportId: z.string().optional(),
});

export interface RemoveContentResult {
  ok: boolean;
  error?: string;
}

export const removeContentServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<RemoveContentResult> => {
    let adminUid: string;
    try {
      adminUid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Sessão inválida." };
    }
    if (!(await isAdminUidServer(adminUid))) {
      return { ok: false, error: "Acesso restrito a administradores." };
    }

    const collectionName = COLLECTION_BY_TYPE[data.contentType];
    const realId = data.contentType === "recommendation" ? stripCommunityPrefix(data.contentId) : data.contentId;

    const tx = await FirestoreTransaction.begin();
    try {
      const writes: any[] = [];
      tx.del(collectionName, realId, writes);

      if (data.reportCollection && data.reportId) {
        tx.upsert(data.reportCollection, data.reportId, { status: "resolved" }, writes, ["status"]);
      }

      const logId = `${data.contentType}_${realId}_${Date.now()}`;
      tx.upsert(
        "moderation_actions",
        logId,
        {
          targetContentId: realId,
          contentType: data.contentType,
          adminUid,
          action: "remove_content",
          reason: data.reason ?? "",
          createdAt: Date.now(),
        },
        writes,
      );

      await tx.commit(writes);
      return { ok: true };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível remover o conteúdo. Tente novamente." };
    }
  });