import type { Work } from "./types";

export interface TasteProfile {
  typeCounts: Record<string, number>;
  genreCounts: Record<string, number>;
  totalWorks: number;
  updatedAt: number;
}

// Limita quantos gêneros vão pro documento público — só os mais relevantes,
// pra não deixar o doc gigante nem expor a biblioteca inteira de ninguém.
const MAX_GENRES = 20;

export function buildTasteProfile(works: Work[]): TasteProfile {
  const typeCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};

  for (const w of works) {
    typeCounts[w.type] = (typeCounts[w.type] ?? 0) + 1;
    (w.genres ?? []).forEach((g) => {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    });
  }

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_GENRES);

  return {
    typeCounts,
    genreCounts: Object.fromEntries(topGenres),
    totalWorks: works.length,
    updatedAt: Date.now(),
  };
}

// Similaridade de cosseno entre dois perfis (tipos + gêneros no mesmo
// "espaço"). Retorna um número de 0 a 100 — quanto maior, mais parecido
// o gosto das duas bibliotecas.
export function tasteSimilarity(a: TasteProfile, b: TasteProfile): number {
  const keys = new Set([
    ...Object.keys(a.typeCounts).map((k) => `type:${k}`),
    ...Object.keys(b.typeCounts).map((k) => `type:${k}`),
    ...Object.keys(a.genreCounts).map((k) => `genre:${k}`),
    ...Object.keys(b.genreCounts).map((k) => `genre:${k}`),
  ]);
  if (keys.size === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  keys.forEach((k) => {
    const [kind, name] = k.split(":");
    const va = kind === "type" ? (a.typeCounts[name] ?? 0) : (a.genreCounts[name] ?? 0);
    const vb = kind === "type" ? (b.typeCounts[name] ?? 0) : (b.genreCounts[name] ?? 0);
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  });
  if (magA === 0 || magB === 0) return 0;

  const cos = dot / (Math.sqrt(magA) * Math.sqrt(magB));
  return Math.round(Math.max(0, Math.min(1, cos)) * 100);
}

// Gêneros em comum entre dois perfis, pra mostrar algo tipo
// "vocês curtem Romance, Fantasia" no card de sugestão.
export function sharedGenres(a: TasteProfile, b: TasteProfile, max = 3): string[] {
  return Object.keys(a.genreCounts)
    .filter((g) => b.genreCounts[g])
    .sort(
      (g1, g2) =>
        (b.genreCounts[g2] ?? 0) + (a.genreCounts[g2] ?? 0) - ((b.genreCounts[g1] ?? 0) + (a.genreCounts[g1] ?? 0)),
    )
    .slice(0, max);
}