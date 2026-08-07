// src/lib/fanfarra/contentGate.ts
// Sistema de filtro de conteúdo sensível por idade.

// Tags que, se escolhidas ao cadastrar uma obra, marcam ela como "conteúdo
// sensível" e disparam o aviso/bloqueio pra usuários mais novos.
export const SENSITIVE_CONTENT_TAGS = [
  "Violência gráfica",
  "Conteúdo sexual / nudez",
  "Linguagem pesada",
  "Automutilação / suicídio",
  "Uso de drogas",
  "Terror / conteúdo perturbador",
  "Discriminação / temas sensíveis",
] as const;

export type SensitiveContentTag = (typeof SENSITIVE_CONTENT_TAGS)[number];

// Tag especial pro botão "Obra madura (18+)" (estilo Wattpad) — não aparece
// na lista de chips normal, é ativada por um toggle simples separado, mas
// usa o MESMO mecanismo de aviso/bloqueio das outras tags sensíveis.
export const MATURE_TAG = "Conteúdo adulto (18+)";

// Calcula idade atual a partir de uma data "YYYY-MM-DD". Retorna null se
// não tiver data (usuário deslogado ou conta antiga sem esse campo).
export function calculateAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  // valida que é uma data real (ex: rejeita 2023-02-30)
  const check = new Date(year, month, day);
  if (check.getFullYear() !== year || check.getMonth() !== month || check.getDate() !== day) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - year;
  const hasHadBirthdayThisYear =
    now.getMonth() > month || (now.getMonth() === month && now.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export type ContentGateLevel = "blocked" | "warn" | "clear";

// Regra:
// - Obra sem nenhuma tag sensível -> sempre "clear".
// - Menor de 10 anos -> "blocked" (bloqueio total).
// - 10 anos ou mais, OU idade desconhecida (deslogado / conta antiga sem
//   data cadastrada) -> "warn" (aviso, com opção de continuar). Idade
//   desconhecida cai em "warn" e não em "clear" de propósito — é o lado
//   mais seguro por padrão.
export function getContentGateLevel(
  contentWarnings: string[] | undefined,
  birthDate: string | undefined,
): ContentGateLevel {
  if (!contentWarnings || contentWarnings.length === 0) return "clear";
  const age = calculateAge(birthDate);
  if (age !== null && age < 10) return "blocked";
  return "warn";
}

// Usado em listagens (feed de recomendações) pra tirar da lista qualquer
// item bloqueado pra idade do usuário — itens em "warn" continuam
// aparecendo na lista normalmente; o aviso só entra ao abrir o item.
export function filterBlockedForAge<T extends { contentWarnings?: string[] }>(
  items: T[],
  birthDate: string | undefined,
): T[] {
  return items.filter((item) => getContentGateLevel(item.contentWarnings, birthDate) !== "blocked");
}