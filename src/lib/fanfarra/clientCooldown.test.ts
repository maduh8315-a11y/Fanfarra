import { describe, it, expect, vi, afterEach } from "vitest";
import { checkClientCooldown } from "./clientCooldown";

describe("checkClientCooldown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("deixa passar a primeira chamada de uma chave nova", () => {
    const key = `report-content:${Math.random()}`;
    expect(() => checkClientCooldown(key, 1500)).not.toThrow();
  });

  it("bloqueia uma segunda chamada rápida demais (evita denúncia em duplo clique)", () => {
    const key = `report-content:${Math.random()}`;
    checkClientCooldown(key, 1500);
    expect(() => checkClientCooldown(key, 1500)).toThrow(/Aguarde/);
  });

  it("libera de novo depois que o intervalo mínimo passa", () => {
    vi.useFakeTimers();
    const key = `report-content:${Math.random()}`;
    checkClientCooldown(key, 1500);
    vi.advanceTimersByTime(1501);
    expect(() => checkClientCooldown(key, 1500)).not.toThrow();
  });
});
