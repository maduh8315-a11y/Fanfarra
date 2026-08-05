// src/lib/fanfarra/feedback.ts
import { auth } from "./firebase";
import { checkClientCooldown } from "./clientCooldown";
import { sendFeedbackServer } from "@/lib/api/sendFeedback.functions";

export async function sendFeedback(params: {
  type: "bug" | "sugestao" | "outro";
  message: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Você precisa estar logado para enviar feedback.");
  checkClientCooldown(`send-feedback:${user.uid}`, 1500);

  const idToken = await user.getIdToken();
  const result = await sendFeedbackServer({ data: { idToken, ...params } });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível enviar o feedback.");
}