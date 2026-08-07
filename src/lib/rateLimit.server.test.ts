import { describe, it, expect, vi, beforeEach } from "vitest";

// getRequestHeader depende do contexto de request do TanStack Start, que não
// existe fora de uma requisição real — como só testamos checkRateLimit,
// mockamos o módulo pra evitar esse acoplamento.
vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeader: () => undefined,
}));

import { checkRateLimit } from "./rateLimit.server";

describe("checkRateLimit", () => {
  it("permite a primeira chamada dentro do limite", () => {
    const result = checkRateLimit("report-content", "user-1", 5, 10 * 60 * 1000);
    expect(result.allowed).toBe(true);
  });

  it("permite até o limite exato de chamadas na janela", () => {
    const id = `user-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("report-content", id, 5, 10 * 60 * 1000).allowed).toBe(true);
    }
  });

  it("bloqueia a 6ª denúncia dentro da janela de 10 minutos (regra: máx 5 a cada 10min)", () => {
    const id = `user-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit("report-content", id, 5, 10 * 60 * 1000);
    }
    const sixth = checkRateLimit("report-content", id, 5, 10 * 60 * 1000);
    expect(sixth.allowed).toBe(false);
    if (!sixth.allowed) {
      expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("não deixa um usuário bloqueado afetar o limite de outro usuário", () => {
    const idA = `user-a-${Math.random()}`;
    const idB = `user-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit("report-content", idA, 5, 10 * 60 * 1000);
    expect(checkRateLimit("report-content", idA, 5, 10 * 60 * 1000).allowed).toBe(false);
    expect(checkRateLimit("report-content", idB, 5, 10 * 60 * 1000).allowed).toBe(true);
  });

  it("libera novamente depois que a janela de tempo expira", () => {
    vi.useFakeTimers();
    try {
      const id = `user-${Math.random()}`;
      for (let i = 0; i < 5; i++) checkRateLimit("report-content", id, 5, 1000);
      expect(checkRateLimit("report-content", id, 5, 1000).allowed).toBe(false);

      vi.advanceTimersByTime(1001);

      expect(checkRateLimit("report-content", id, 5, 1000).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
