// src/lib/fanfarra/moderationActions.ts
import { auth } from "./firebase";
import { moderateUserServer } from "@/lib/api/moderateUser.functions";
import { removeContentServer } from "@/lib/api/removeContent.functions";
import { setReportStatusServer } from "@/lib/api/setReportStatus.functions";
import { listBannedUsersServer, type BannedUserEntry } from "@/lib/api/listBannedUsers.functions";

export type { BannedUserEntry };

async function idToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Você precisa estar logado.");
  return user.getIdToken();
}

export async function banUser(targetUid: string, reason?: string): Promise<void> {
  const result = await moderateUserServer({ data: { idToken: await idToken(), targetUid, action: "ban", reason } });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível banir o usuário.");
}

export async function suspendUser(targetUid: string, minutes: number, reason?: string): Promise<void> {
  const result = await moderateUserServer({
    data: { idToken: await idToken(), targetUid, action: "suspend", suspendMinutes: minutes, reason },
  });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível suspender o usuário.");
}

export async function unbanUser(targetUid: string): Promise<void> {
  const result = await moderateUserServer({ data: { idToken: await idToken(), targetUid, action: "unban" } });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível reativar o usuário.");
}

export async function removeReportedContent(
  contentType: "recommendation" | "comment",
  contentId: string,
  reason: string | undefined,
  reportCollection: "content_reports" | "reports",
  reportId: string,
): Promise<void> {
  const result = await removeContentServer({
    data: { idToken: await idToken(), contentType, contentId, reason, reportCollection, reportId },
  });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível remover o conteúdo.");
}

export async function setReportStatus(
  reportCollection: "content_reports" | "reports",
  reportId: string,
  status: "resolved" | "dismissed",
): Promise<void> {
  const result = await setReportStatusServer({
    data: { idToken: await idToken(), reportCollection, reportId, status },
  });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível atualizar a denúncia.");
}

export async function listBannedUsers(): Promise<BannedUserEntry[]> {
  const result = await listBannedUsersServer({ data: { idToken: await idToken() } });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível carregar a lista.");
  return result.users ?? [];
}