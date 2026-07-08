import { getRequestHeader, type RequestHeaderName } from "@tanstack/react-start/server";

// Rate limiter simples em memória, por IP + ação.
//
// Importante: como o app roda em Cloudflare Workers, essa memória é por
// "isolate" — não é garantido que todas as requisições caiam sempre na
// mesma instância. Ou seja, isso NÃO é um rate limit perfeito e
// distribuído (pra isso precisaria de Cloudflare KV/Durable Objects ou
// similar). Mas já bloqueia a grande maioria dos casos de automação
// simples/abuso acidental, que é o problema real pra um app desse porte.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Limpa entradas expiradas de vez em quando pra não vazar memória.
let lastCleanup = Date.now();
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Pega o IP de quem fez a requisição. Tenta o header do Cloudflare
 * primeiro (mais confiável no nosso deploy), com fallback genérico.
 */
export function getClientIp(): string {
  return (
    getRequestHeader("cf-connecting-ip" as RequestHeaderName) ??
    getRequestHeader("x-forwarded-for" as RequestHeaderName)?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Verifica e consome uma "cota" de uso.
 *
 * @param action     Nome da ação sendo limitada (ex: "import-work", "upload-image")
 * @param identifier Normalmente o IP de quem chamou (getClientIp())
 * @param limit      Quantas chamadas são permitidas dentro da janela
 * @param windowMs   Duração da janela, em milissegundos
 * @returns { allowed: true } ou { allowed: false, retryAfterSeconds }
 */
export function checkRateLimit(
  action: string,
  identifier: string,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  cleanupIfNeeded();

  const key = `${action}:${identifier}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}
