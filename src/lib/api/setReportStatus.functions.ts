// src/lib/api/setReportStatus.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyFirebaseIdToken, FirestoreTransaction, isAdminUidServer } from "@/lib/googleFirestoreRest.server";

const inputSchema = z.object({
  idToken: z.string().min(1),
  reportCollection: z.enum(["content_reports", "reports"]),
  reportId: z.string().min(1),
  status: z.enum(["resolved", "dismissed"]),
});

export interface SetReportStatusResult {
  ok: boolean;
  error?: string;
}

export const setReportStatusServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<SetReportStatusResult> => {
    let adminUid: string;
    try {
      adminUid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Sessão inválida." };
    }
    if (!(await isAdminUidServer(adminUid))) {
      return { ok: false, error: "Acesso restrito a administradores." };
    }

    const tx = await FirestoreTransaction.begin();
    try {
      const writes: any[] = [];
      tx.upsert(data.reportCollection, data.reportId, { status: data.status }, writes, ["status"]);
      await tx.commit(writes);
      return { ok: true };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível atualizar a denúncia. Tente novamente." };
    }
  });