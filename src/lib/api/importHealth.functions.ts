// src/lib/api/importHealth.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";
import { isAdminUid } from "@/lib/fanfarra/config";
import { getImportHealth, type ImportHealthDoc } from "./importWork/monitor.server";

const inputSchema = z.object({ idToken: z.string() });

export const getImportHealthServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<{ ok: true; data: ImportHealthDoc[] } | { ok: false; error: string }> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Sessão inválida." };
    }
    if (!(await isAdminUid(uid))) {
      return { ok: false, error: "Acesso restrito." };
    }
    const health = await getImportHealth();
    return { ok: true, data: health };
  });