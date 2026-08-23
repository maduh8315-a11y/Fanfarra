// src/lib/api/listBannedUsers.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyFirebaseIdToken, FirestoreTransaction, isAdminUidServer } from "@/lib/googleFirestoreRest.server";

const inputSchema = z.object({ idToken: z.string().min(1) });

export interface BannedUserEntry {
  uid: string;
  username: string;
  avatar?: string;
  banned: boolean;
  suspendedUntil: number;
  actionAt?: number;
  actionReason?: string;
  actionType?: "ban" | "suspend";
}

export interface ListBannedUsersResult {
  ok: boolean;
  error?: string;
  users?: BannedUserEntry[];
}

const REGISTRY_COLLECTION = "app_config";
const REGISTRY_DOC = "banned_users_registry";

interface RegistryEntry {
  username: string;
  avatar: string | null;
  banned: boolean;
  suspendedUntil: number;
  reason: string;
  actionAt: number;
  actionType: "ban" | "suspend";
}

export const listBannedUsersServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<ListBannedUsersResult> => {
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
      const registry = await tx.get<{ entries?: Record<string, RegistryEntry> }>(REGISTRY_COLLECTION, REGISTRY_DOC);
      await tx.rollback(); // só leitura

      const now = Date.now();
      const entries = registry.data.entries ?? {};

      const users: BannedUserEntry[] = Object.entries(entries)
        .filter(([, e]) => e.banned || e.suspendedUntil > now)
        .map(([uid, e]) => ({
          uid,
          username: e.username || uid,
          avatar: e.avatar ?? undefined,
          banned: e.banned,
          suspendedUntil: e.suspendedUntil,
          actionAt: e.actionAt,
          actionReason: e.reason || undefined,
          actionType: e.actionType,
        }))
        .sort((a, b) => (b.actionAt ?? 0) - (a.actionAt ?? 0));

      return { ok: true, users };
    } catch {
      await tx.rollback();
      return { ok: false, error: "Não foi possível carregar a lista." };
    }
  });