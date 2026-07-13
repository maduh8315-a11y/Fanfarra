// Cooldown simples, em memória, do lado do cliente — evita que a MESMA aba
// dispare várias escritas por segundo (clique repetido, duplo clique, etc).
//
// IMPORTANTE: isso NÃO é proteção de servidor. É só uma primeira barreira
// contra spam casual pela própria tela do app — no mesmo espírito do
// rateLimit.server.ts (que limita por IP nos server functions de
// import/upload), mas aqui não existe uma requisição de servidor pra
// amarrar o limite, então o controle fica no cliente mesmo.
const lastActionAt = new Map<string, number>();

/**
 * Verifica se já passou tempo suficiente desde a última vez que essa `key`
 * foi usada. Se não passou, lança um erro com quantos segundos faltam
 * (a mensagem já é adequada pra mostrar direto num toast). Se passou,
 * registra a ação como feita agora.
 *
 * @param key         Identificador único da ação (ex: `rec-comment:${uid}`)
 * @param minIntervalMs Intervalo mínimo exigido entre duas chamadas, em ms
 */
export function checkClientCooldown(key: string, minIntervalMs: number): void {
  const now = Date.now();
  const last = lastActionAt.get(key);
  if (last !== undefined && now - last < minIntervalMs) {
    const waitSeconds = Math.ceil((minIntervalMs - (now - last)) / 1000);
    throw new Error(`Calma aí! Aguarde ${waitSeconds}s antes de tentar de novo.`);
  }
  lastActionAt.set(key, now);
}