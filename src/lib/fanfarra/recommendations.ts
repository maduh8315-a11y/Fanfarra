import type { Work } from "./types";
import type { PostedRecommendation } from "./communityStore";
import type { RelatedWork } from "./formConfig";
export interface RecommendationItem {
  id: string;
  type: string;
  title: string;
  author: string;
  synopsis: string;
  year: number;
  status: string;
  genres: string[];
  popularity: number;
  recommendedBy?: string; // @username de quem adicionou à biblioteca
  cover?: string; // capa da obra
  rating?: number; // avaliação (0-5) de quem publicou
  notes?: string; // comentário / nota pessoal de quem publicou
  link?: string;
  studio?: string;
  tags?: string[];
  reactions?: string[];
  // campos opcionais por tipo
  episodes?: number;
  chapters?: number;
  volumes?: number;
  issues?: number;
  pages?: number;
  duration?: number;
  hours?: number;
  seasons?: number;
  platform?: string;
  fandom?: string;
  words?: number;
  related?: RelatedWork[]; // obras relacionadas escolhidas manualmente pelo autor da obra
}

export { CATALOG } from "./recommendationsData";
type ScoredItem = RecommendationItem & { _score: number };

// Calcula score de cada item baseado no perfil do usuário + popularidade
export function scoreItems(catalog: RecommendationItem[], works: Work[]): RecommendationItem[] {
  if (works.length === 0) {
    return [...catalog].sort((a, b) => b.popularity - a.popularity);
  }

  // Conta tipos e gêneros do usuário
  const typeCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};

  for (const w of works) {
    typeCounts[w.type] = (typeCounts[w.type] ?? 0) + 1;
    (w.genres ?? []).forEach((g) => {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    });
  }

  const maxType = Math.max(...Object.values(typeCounts), 1);
  const maxGenre = Math.max(...Object.values(genreCounts), 1);

  return [...catalog]
    .map((item): ScoredItem => {
      const typeScore = ((typeCounts[item.type] ?? 0) / maxType) * 40;
      const genreScore =
        item.genres.reduce((sum, g) => sum + (genreCounts[g] ?? 0), 0) /
        (item.genres.length * maxGenre) * 40;
      const popularityScore = (item.popularity / 100) * 20;
      return { ...item, _score: typeScore + genreScore + popularityScore };
    })
    .sort((a, b) => b._score - a._score);
}

export function getByType(
  scored: RecommendationItem[],
  type: string,
  limit = 10,
): RecommendationItem[] {
  return scored.filter((i) => i.type === type).slice(0, limit);
}

export function getTrending(scored: RecommendationItem[], limit = 10): RecommendationItem[] {
  return [...scored].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

export function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() && v.trim() !== "?") {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

// Converte uma recomendação pública (postada por um usuário real) para o
// mesmo formato usado nas telas de recomendação e na página de visualização.
export function communityToRecommendationItem(r: PostedRecommendation): RecommendationItem {
  const d = r.details || {};
  return {
    id: `community_${r.id}`,
    type: r.type,
    title: r.title,
    author: r.author || "",
    synopsis: "",
    year: new Date(r.createdAt).getFullYear(),
    status: "",
    genres: r.genres || [],
    popularity: Math.round((r.rating || 0) * 20),
    recommendedBy: r.username,
    cover: r.cover,
    rating: r.rating,
    notes: r.notes,
    link: r.link,
    studio: (d.studio as string) || undefined,
    tags: (d.tags as string[]) || undefined,
    reactions: (d.reactions as string[]) || undefined,
    episodes: toNum(d.totalEpisodes),
    chapters: toNum(d.totalChapters),
    volumes: toNum(d.totalVolumes),
    seasons: toNum(d.totalSeasons),
    duration: toNum(d.duration),
    hours: toNum(d.hours),
    issues: toNum(d.totalIssues),
    platform: (d.platform as string) || undefined,
    related: (d.related as RelatedWork[]) || undefined,
  };
}
