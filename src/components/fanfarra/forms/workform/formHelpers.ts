import type { MediaType, FieldDef } from "@/lib/fanfarra/types";
import { TYPE_FIELDS } from "@/lib/fanfarra/types";
import type { DateParts } from "@/lib/fanfarra/types";

export const GENRES = [
  "Ação",
  "Aventura",
  "Comédia",
  "Drama",
  "Romance",
  "Fantasia",
  "Sci-fi",
  "Terror",
  "Mistério",
  "Slice of life",
  "Sobrenatural",
  "Psicológico",
];

export const MUSIC_GENRES = [
  "Pop",
  "Rock",
  "Rap/Hip-Hop",
  "R&B",
  "Eletrônica",
  "Sertanejo",
  "Funk",
  "MPB",
  "Pagode/Samba",
  "K-pop",
  "Indie",
  "Jazz",
  "Country",
  "Metal",
];

// Traduz/mapeia gêneros vindos de APIs externas (em inglês) para as opções
// fixas do app (em português), usadas pelos chips de gênero.
export const GENRE_ALIASES: Record<string, string> = {
  action: "Ação",
  adventure: "Aventura",
  comedy: "Comédia",
  drama: "Drama",
  romance: "Romance",
  fantasy: "Fantasia",
  "sci-fi": "Sci-fi",
  scifi: "Sci-fi",
  "science fiction": "Sci-fi",
  horror: "Terror",
  mystery: "Mistério",
  suspense: "Mistério",
  thriller: "Mistério",
  "slice of life": "Slice of life",
  supernatural: "Sobrenatural",
  psychological: "Psicológico",
};

export function matchImportedGenres(imported: string[] | undefined, options: readonly string[]): string[] {
  if (!imported || imported.length === 0) return [];
  const result = new Set<string>();
  for (const raw of imported) {
    for (const token of raw.split(/[/,]/)) {
      const key = token.trim().toLowerCase();
      if (!key) continue;
      const alias = GENRE_ALIASES[key];
      if (alias && (options as readonly string[]).includes(alias)) {
        result.add(alias);
        continue;
      }
      const direct = options.find((o) => o.toLowerCase() === key);
      if (direct) result.add(direct);
    }
  }
  return Array.from(result);
}

// ─── Helpers para mapear plataforma / país / idioma vindos da importação ──

export const PLATFORM_ALIASES: Record<string, string> = {
  ao3: "AO3",
  "archive of our own": "AO3",
  wattpad: "Wattpad",
  "spirit fanfics": "Spirit Fanfics",
  spiritfanfics: "Spirit Fanfics",
  "fanfiction.net": "Fanfiction.net",
  ffn: "Fanfiction.net",
  steam: "PC",
  pc: "PC",
};

export const COUNTRY_ALIASES: Record<string, string> = {
  "south korea": "Coreia",
  korea: "Coreia",
  china: "China",
  japan: "Japão",
  thailand: "Tailândia",
};

export const LANGUAGE_ALIASES: Record<string, string> = {
  english: "EN",
  en: "EN",
  português: "PT",
  portuguese: "PT",
  pt: "PT",
  español: "ES",
  spanish: "ES",
  es: "ES",
};

export function matchChipValue(
  raw: string | undefined,
  options: readonly string[],
  aliases: Record<string, string>,
): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  if (aliases[key] && options.includes(aliases[key])) return aliases[key];
  return options.find((o) => o.toLowerCase() === key);
}

export function matchChipValues(
  raw: string[] | undefined,
  options: readonly string[],
  aliases: Record<string, string>,
): string[] {
  if (!raw) return [];
  const result = new Set<string>();
  for (const r of raw) {
    const m = matchChipValue(r, options, aliases);
    if (m) result.add(m);
  }
  return Array.from(result);
}

export function getChipField(
  type: MediaType,
  key: string,
): { options: readonly string[]; multi?: boolean } | undefined {
  return TYPE_FIELDS[type].find(
    (f): f is Extract<FieldDef, { kind: "chips" }> => f.key === key && f.kind === "chips",
  );
}

export function endDateLabel(type: MediaType): string {
  if (type === "Filme") return "Data que assistiu";
  if (type === "Jogo") return "Data que zerou";
  if (type === "Anime" || type === "Série" || type === "Donghua" || type === "Dorama")
    return "Data que terminou de assistir";
  if (
    type === "Manga" ||
    type === "Manhwa" ||
    type === "Manhua" ||
    type === "Webtoon" ||
    type === "Livro" ||
    type === "Light Novel" ||
    type === "HQ" ||
    type === "Fanfic"
  )
    return "Data que terminou de ler";
  return "Data de conclusão";
}

export function hasAnyDatePart(d?: DateParts): boolean {
  return !!d && (d.d != null || d.m != null || d.y != null);
}