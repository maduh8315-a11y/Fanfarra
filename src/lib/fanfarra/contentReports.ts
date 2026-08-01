// src/lib/fanfarra/contentReports.ts
import { auth } from "./firebase";
import { checkClientCooldown } from "./clientCooldown";
import { reportContentServer } from "@/lib/api/reportContent.functions";

export async function reportContent(params: {
  contentType: "recommendation" | "comment" | "profile";
  contentId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Você precisa estar logado para denunciar.");
  checkClientCooldown(`report-content:${user.uid}`, 1500);

  const idToken = await user.getIdToken();
  const result = await reportContentServer({ data: { idToken, ...params } });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível enviar a denúncia.");
}