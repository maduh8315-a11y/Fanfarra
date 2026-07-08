// Utilitário compartilhado: o Firestore rejeita campos com valor `undefined`
// (tanto no nível raiz quanto dentro de objetos/arrays aninhados). Como vários
// formulários do app usam o padrão `campo || undefined` para "campo vazio",
// centralizamos aqui a limpeza antes de qualquer setDoc/updateDoc.
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined) continue;
      result[key] = stripUndefined(val);
    }
    return result as T;
  }
  return value;
}
