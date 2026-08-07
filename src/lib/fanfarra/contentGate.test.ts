import { describe, it, expect } from "vitest";
import { calculateAge, getContentGateLevel, filterBlockedForAge } from "./contentGate";

describe("calculateAge", () => {
  it("retorna null quando não há data de nascimento", () => {
    expect(calculateAge(undefined)).toBeNull();
  });

  it("retorna null para uma data inválida", () => {
    expect(calculateAge("não-é-uma-data")).toBeNull();
  });

  function toIsoLocal(y: number, m: number, d: number): string {
    return `${String(y).padStart(4, "0")}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  it("calcula a idade corretamente quando o aniversário já passou este ano", () => {
    const hoje = new Date();
    const iso = toIsoLocal(hoje.getFullYear() - 20, hoje.getMonth(), hoje.getDate() - 1);
    expect(calculateAge(iso)).toBe(20);
  });

  it("não soma o ano ainda quando o aniversário ainda não chegou", () => {
    const hoje = new Date();
    // nasceu num mês/dia que só "faz aniversário" amanhã
    const iso = toIsoLocal(hoje.getFullYear() - 20, hoje.getMonth(), hoje.getDate() + 1);
    expect(calculateAge(iso)).toBe(19);
  });
});

describe("getContentGateLevel", () => {
  it("libera direto quando a obra não tem nenhuma tag sensível", () => {
    expect(getContentGateLevel(undefined, "2000-01-01")).toBe("clear");
    expect(getContentGateLevel([], "2000-01-01")).toBe("clear");
  });

  it("bloqueia totalmente para menores de 10 anos", () => {
    const hoje = new Date();
    const nascimento = `${hoje.getFullYear() - 8}-01-01`;
    expect(getContentGateLevel(["Violência gráfica"], nascimento)).toBe("blocked");
  });

  it("apenas avisa (não bloqueia) para quem tem 10 anos ou mais", () => {
    const hoje = new Date();
    const nascimento = `${hoje.getFullYear() - 10}-01-01`;
    expect(getContentGateLevel(["Conteúdo sexual / nudez"], nascimento)).toBe("warn");
  });

  it("cai em 'warn' (não em 'clear') quando a idade é desconhecida — lado mais seguro", () => {
    expect(getContentGateLevel(["Terror / conteúdo perturbador"], undefined)).toBe("warn");
  });
});

describe("filterBlockedForAge", () => {
  it("remove da lista apenas os itens bloqueados pra idade do usuário", () => {
    const hoje = new Date();
    const nascimentoCrianca = `${hoje.getFullYear() - 8}-01-01`;
    const itens = [
      { id: 1, contentWarnings: ["Violência gráfica"] },
      { id: 2, contentWarnings: [] as string[] },
      { id: 3, contentWarnings: undefined },
    ];
    const resultado = filterBlockedForAge(itens, nascimentoCrianca);
    expect(resultado.map((i) => i.id)).toEqual([2, 3]);
  });
});
