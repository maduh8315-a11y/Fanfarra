// src/lib/api/actionRateLimit.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { verifyFirebaseIdToken } from "@/lib/googleFirestoreRest.server";

// Ações cobertas por este endpoint + limite de cada uma. Tudo num lugar só
// pra não espalhar número mágico pelo código. Ajuste os valores se sentir
// que estão apertados ou frouxos demais no uso real.
const ACTION_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "chat-send": { limit: 20, windowMs: 10_000 }, // 20 mensagens / 10s por usuário
  "friend-request": { limit: 10, windowMs: 60_000 }, // 10 pedidos / min por usuário
  "award-vote": { limit: 30, windowMs: 10_000 }, // 30 aplausos/vaias / 10s por usuário
};

const inputSchema = z.object({
  idToken: z.string().min(1),
  action: z.enum(["chat-send", "friend-request", "award-vote"]),
});

export interface CheckActionRateLimitResult {
  ok: boolean;
  error?: string;
}

// Endpoint genérico: só valida o login e consome uma cota do rate limiter
// do servidor. A escrita em si continua acontecendo no client logo depois
// (igual já era) — este endpoint só barra quando o usuário está abusando.
export const checkActionRateLimitServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<CheckActionRateLimitResult> => {
    let uid: string;
    try {
      uid = await verifyFirebaseIdToken(data.idToken);
    } catch {
      return { ok: false, error: "Você precisa estar logado para continuar." };
    }

    const cfg = ACTION_LIMITS[data.action];
    const rate = checkRateLimit(data.action, uid, cfg.limit, cfg.windowMs);
    if (!rate.allowed) {
      return { ok: false, error: `Calma aí! Aguarde ${rate.retryAfterSeconds}s antes de tentar de novo.` };
    }
    return { ok: true };
  });