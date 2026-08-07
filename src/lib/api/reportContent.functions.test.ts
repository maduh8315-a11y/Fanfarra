import { describe, it, expect } from "vitest";
import { inputSchema } from "./reportContent.functions";

// Esses são os dados que chegam no servidor (reportContent.functions.ts)
// antes de gravar a denúncia no Firestore. É a última barreira contra
// dados malformados/maliciosos vindos do cliente.

describe("validação da denúncia (reportContentServer)", () => {
  const base = {
    idToken: "token-valido",
    contentType: "comment" as const,
    contentId: "comentario-123",
    reason: "Discurso de ódio",
  };

  it("aceita uma denúncia válida, com e sem detalhes opcionais", () => {
    expect(inputSchema.safeParse(base).success).toBe(true);
    expect(inputSchema.safeParse({ ...base, details: "mais contexto aqui" }).success).toBe(true);
  });

  it("rejeita sem token de autenticação", () => {
    const result = inputSchema.safeParse({ ...base, idToken: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita tipo de conteúdo fora da lista permitida (recommendation/comment/profile)", () => {
    const result = inputSchema.safeParse({ ...base, contentType: "obra" });
    expect(result.success).toBe(false);
  });

  it("rejeita sem motivo (reason) ou motivo vazio", () => {
    expect(inputSchema.safeParse({ ...base, reason: "" }).success).toBe(false);
    const { reason: _omit, ...semReason } = base;
    expect(inputSchema.safeParse(semReason).success).toBe(false);
  });

  it("rejeita motivo maior que 120 caracteres", () => {
    const result = inputSchema.safeParse({ ...base, reason: "a".repeat(121) });
    expect(result.success).toBe(false);
  });

  it("rejeita detalhes maiores que 500 caracteres", () => {
    const result = inputSchema.safeParse({ ...base, details: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejeita sem o id do conteúdo denunciado", () => {
    const result = inputSchema.safeParse({ ...base, contentId: "" });
    expect(result.success).toBe(false);
  });
});
