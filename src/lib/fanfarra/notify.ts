// Ponte fina pro server function que grava notificação na conta de OUTRO
// usuário — o client não tem permissão direta pra isso (ver firestore.rules,
// coleção "notifications": só quem é dono pode criar a própria notificação).
import { auth } from "./firebase";
import { notifyManyServer, notifyAllUsersServer } from "@/lib/fanfarra/social.functions";

export type SocialNotifIcon = "user-plus" | "users" | "heart" | "eye" | "message-circle";

export async function notifyMany(toUids: string[], icon: SocialNotifIcon, text: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || toUids.length === 0) return;
  try {
    const idToken = await user.getIdToken();
    await notifyManyServer({ data: { idToken, toUids, icon, text } });
  } catch (err) {
    console.error("Erro ao enviar notificação social:", err);
  }
}

export async function notifyAllUsers(
  icon: SocialNotifIcon | "award" | "calendar-clock",
  text: string,
): Promise<{ ok: boolean; error?: string; sent?: number }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "Você precisa estar logado." };
  try {
    const idToken = await user.getIdToken();
    return await notifyAllUsersServer({ data: { idToken, icon: icon as any, text } });
  } catch (err) {
    console.error("Erro ao enviar aviso geral:", err);
    return { ok: false, error: "Não foi possível enviar o aviso." };
  }
}