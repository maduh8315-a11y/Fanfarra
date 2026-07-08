import type { MediaType, Status } from "./types";

export interface ProgressPair {
  currentKey: string;
  currentLabel: string;
  totalKey: string;
  totalLabel: string;
  totalIsPercent?: boolean;
  unit?: string;
  verb?: string;
}

export const PROGRESS_PAIRS: Record<MediaType, ProgressPair[]> = {
  Anime: [
    {
      currentKey: "episode",
      currentLabel: "Episódio atual",
      totalKey: "totalEpisodes",
      totalLabel: "Total de episódios",
    },
    {
      currentKey: "season",
      currentLabel: "Temporada atual",
      totalKey: "totalSeasons",
      totalLabel: "Total de temporadas",
    },
  ],
  Série: [
    {
      currentKey: "episode",
      currentLabel: "Episódio atual",
      totalKey: "totalEpisodes",
      totalLabel: "Total de episódios",
    },
    {
      currentKey: "season",
      currentLabel: "Temporada atual",
      totalKey: "totalSeasons",
      totalLabel: "Total de temporadas",
    },
  ],
  Donghua: [
    {
      currentKey: "episode",
      currentLabel: "Episódio atual",
      totalKey: "totalEpisodes",
      totalLabel: "Total de episódios",
    },
    {
      currentKey: "season",
      currentLabel: "Temporada atual",
      totalKey: "totalSeasons",
      totalLabel: "Total de temporadas",
    },
  ],
  Webtoon: [
    {
      currentKey: "episode",
      currentLabel: "Episódio atual",
      totalKey: "totalEpisodes",
      totalLabel: "Total de episódios",
    },
  ],
  Manga: [
    {
      currentKey: "chapter",
      currentLabel: "Capítulo atual",
      totalKey: "totalChapters",
      totalLabel: "Total de capítulos",
    },
    {
      currentKey: "volume",
      currentLabel: "Volume atual",
      totalKey: "totalVolumes",
      totalLabel: "Total de volumes",
    },
  ],
  Manhwa: [
    {
      currentKey: "chapter",
      currentLabel: "Capítulo atual",
      totalKey: "totalChapters",
      totalLabel: "Total de capítulos",
    },
  ],
  Manhua: [
    {
      currentKey: "chapter",
      currentLabel: "Capítulo atual",
      totalKey: "totalChapters",
      totalLabel: "Total de capítulos",
    },
  ],
  Fanfic: [
    {
      currentKey: "chapter",
      currentLabel: "Capítulo atual",
      totalKey: "totalChapters",
      totalLabel: "Total de capítulos",
    },
  ],
  Livro: [
    {
      currentKey: "page",
      currentLabel: "Página atual",
      totalKey: "totalPages",
      totalLabel: "Total de páginas",
    },
  ],
  "Light Novel": [
    {
      currentKey: "volume",
      currentLabel: "Volume atual",
      totalKey: "totalVolumes",
      totalLabel: "Total de volumes",
    },
    {
      currentKey: "chapter",
      currentLabel: "Cap. atual no volume",
      totalKey: "totalChapters",
      totalLabel: "Total de caps. no volume",
    },
  ],
  HQ: [
    {
      currentKey: "issue",
      currentLabel: "Issue/edição atual",
      totalKey: "totalIssues",
      totalLabel: "Total de issues",
    },
    {
      currentKey: "arcCurrent",
      currentLabel: "Volume/Arco atual",
      totalKey: "arcTotal",
      totalLabel: "Total de volumes/arcos",
    },
  ],
  Jogo: [
    {
      currentKey: "hours",
      currentLabel: "Horas jogadas",
      totalKey: "completion",
      totalLabel: "% de conclusão",
      totalIsPercent: true,
    },
  ],
  Filme: [
    {
      currentKey: "watchedMin",
      currentLabel: "Tempo assistido",
      totalKey: "duration",
      totalLabel: "Duração total",
      unit: "min",
      verb: "assistido",
    },
  ],
  Dorama: [
    {
      currentKey: "episode",
      currentLabel: "Episódio atual",
      totalKey: "totalEpisodes",
      totalLabel: "Total de episódios",
    },
    {
      currentKey: "season",
      currentLabel: "Temporada atual",
      totalKey: "totalSeasons",
      totalLabel: "Total de temporadas",
    },
  ],
  Música: [{ currentKey: "plays", currentLabel: "Escutas", totalKey: "", totalLabel: "" }],
  Vídeos: [
    { currentKey: "part", currentLabel: "Vídeo/parte atual", totalKey: "totalParts", totalLabel: "Total de vídeos/partes" },
  ],
  "Gacha Videos": [
    { currentKey: "part", currentLabel: "Parte atual", totalKey: "totalParts", totalLabel: "Total de partes" },
  ],
};

export interface ExtraNumeric {
  key: string;
  label: string;
  placeholder?: string;
}

// hoursWatched removido de Anime/Série/Donghua — agora é calculado automaticamente pelo EpisodeDuration
export const EXTRA_NUMERIC: Partial<Record<MediaType, ExtraNumeric[]>> = {
  Fanfic: [{ key: "wordCount", label: "Quantidade de palavras", placeholder: "ex: 120.000" }],
  "Light Novel": [
    { key: "wordCount", label: "Quantidade de palavras", placeholder: "ex: 120.000" },
  ],
  Livro: [
    { key: "wordCount", label: "Quantidade de palavras (opcional)", placeholder: "ex: 120.000" },
  ],
};

// Tipos que têm campo de duração por episódio (para calcular horas assistidas)
export const EPISODE_DURATION_TYPES: ReadonlySet<MediaType> = new Set<MediaType>([
  "Anime",
  "Série",
  "Donghua",
  "Dorama",
]);

export const ART_RATING_TYPES: ReadonlySet<MediaType> = new Set<MediaType>([
  "Manga",
  "Manhwa",
  "Manhua",
  "Webtoon",
  "HQ",
]);

export const REACTIONS: Record<MediaType, string[]> = {
  Anime: [
    "😭 Me fez chorar",
    "🔥 Obra-prima",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Reassistiria",
    "😴 Que sono",
    "🤯 Mind-blowing",
    "❤️ Virou favorito",
  ],
  Manga: [
    "✍️ Boa arte",
    "📖 Boa história",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Releria",
    "😴 Arrastado",
    "🤯 Mind-blowing",
    "❤️ Virou favorito",
  ],
  Manhwa: [
    "✍️ Arte incrível",
    "📖 Bom roteiro",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Releria",
    "😴 Ritmo lento",
    "🔞 Só pelo plot",
    "❤️ Virou favorito",
  ],
  Manhua: [
    "✍️ Arte incrível",
    "📖 Bom roteiro",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Releria",
    "😴 Ritmo lento",
    "❤️ Virou favorito",
  ],
  Fanfic: [
    "✍️ Boa escrita",
    "📖 Bom roteiro",
    "😭 Emocionante",
    "🚫 Nunca mais",
    "💀 Traumatizei",
    "👎 Mal escrita",
    "🔁 Releria",
    "❤️ Virou favorita",
  ],
  Série: [
    "😭 Me fez chorar",
    "🔥 Obra-prima",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Reassistiria",
    "😴 Que sono",
    "📉 Caiu de qualidade",
    "❤️ Virou favorita",
  ],
  Filme: [
    "😭 Me fez chorar",
    "🔥 Obra-prima",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Reassistiria",
    "😴 Que sono",
    "🤯 Mind-blowing",
    "❤️ Virou favorito",
  ],
  Livro: [
    "✍️ Boa escrita",
    "📖 Enredo incrível",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Releria",
    "😴 Arrastado",
    "🤯 Mind-blowing",
    "❤️ Virou favorito",
  ],
  Jogo: [
    "🎮 Gameplay incrível",
    "🎨 Arte linda",
    "😭 História me quebrou",
    "💀 Traumatizei",
    "🔁 Zerarei de novo",
    "😴 Chato demais",
    "🤯 Mind-blowing",
    "❤️ Virou favorito",
  ],
  Webtoon: [
    "✍️ Arte incrível",
    "📖 Bom roteiro",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Releria",
    "😴 Ritmo lento",
    "🔞 Só pelo plot",
    "❤️ Virou favorito",
  ],
  "Light Novel": [
    "✍️ Boa escrita",
    "📖 Bom roteiro",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Releria",
    "😴 Arrastado",
    "🤯 Mind-blowing",
    "❤️ Virou favorita",
  ],
  Donghua: [
    "😭 Me fez chorar",
    "🔥 Obra-prima",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Reassistiria",
    "✍️ Animação incrível",
    "🤯 Mind-blowing",
    "❤️ Virou favorito",
  ],
  HQ: [
    "✍️ Arte incrível",
    "📖 Roteiro incrível",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Releria",
    "😴 Arrastado",
    "🤯 Mind-blowing",
    "❤️ Virou favorito",
  ],
  Dorama: [
    "😭 Me fez chorar",
    "🔥 Obra-prima",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Reassistiria",
    "😴 Que sono",
    "🥰 Casal favorito",
    "❤️ Virou favorito",
  ],
  Música: [
    "🎧 Repeat infinito",
    "🔥 Hino",
    "😤 Overrated",
    "😭 Emocionante",
    "💃 Bota pra dançar",
    "😴 Não curti",
    "🤯 Produção incrível",
    "❤️ Virou favorita",
  ],
  Vídeos: [
    "😂 Muito engraçado",
    "🔥 Viral",
    "😤 Overrated",
    "💀 Traumatizei",
    "🔁 Reassistiria",
    "😴 Sem graça",
    "🤯 Mind-blowing",
    "❤️ Virou favorito",
  ],
  "Gacha Videos": [
    "😂 Muito engraçado",
    "😭 Emocionante",
    "🔥 Viral",
    "💀 Traumatizei",
    "🔁 Reassistiria",
    "😴 Sem graça",
    "🎨 Edição incrível",
    "❤️ Virou favorito",
  ],
};

export const COMPLETED_STATUS_FOR_TYPE = (t: MediaType): Status => {
  if (t === "Filme") return "Assistido";
  if (t === "Música") return "Ouvido";
  return "Concluído";
};

export function getKeysToSkip(type: MediaType): Set<string> {
  const skip = new Set<string>();
  for (const p of PROGRESS_PAIRS[type] ?? []) {
    skip.add(p.currentKey);
    skip.add(p.totalKey);
  }
  for (const e of EXTRA_NUMERIC[type] ?? []) skip.add(e.key);
  return skip;
}

export const IMPORT_HINTS: Record<MediaType, string> = {
  Anime: "Cole link do MAL ou AniList...",
  Manga: "Cole link do MangaDex/MAL...",
  Manhwa: "Cole link do Webtoon, Kakao...",
  Manhua: "Cole link do MangaDex/Bilibili...",
  Webtoon: "Cole link do Webtoon, Tapas...",
  Fanfic: "Cole link do AO3, Wattpad, Spirit...",
  Série: "Cole link do TMDB/JustWatch...",
  Filme: "Cole link do TMDB/JustWatch...",
  Livro: "Cole link do Google Books/OpenLibrary...",
  Jogo: "Cole link do RAWG/IGDB...",
  "Light Novel": "Cole link do NovelUpdates...",
  Donghua: "Cole link do Bilibili/MAL...",
  HQ: "Cole link da Marvel/DC/ComicVine...",
  Dorama: "Cole link do MyDramaList/Viki...",
  Música: "Cole link do Spotify/YouTube Music...",
  Vídeos: "Cole link do YouTube, TikTok...",
  "Gacha Videos": "Cole link do YouTube, TikTok...",
};

export interface RatingCriterion {
  key: string;
  label: string;
}

export const RATING_CRITERIA: Record<MediaType, RatingCriterion[]> = {
  Anime: [
    { key: "story", label: "História" },
    { key: "animation", label: "Animação" },
    { key: "soundtrack", label: "Trilha sonora" },
    { key: "characters", label: "Personagens" },
  ],
  Manga: [
    { key: "art", label: "Arte" },
    { key: "story", label: "História" },
    { key: "characters", label: "Personagens" },
    { key: "pacing", label: "Ritmo" },
  ],
  Manhwa: [
    { key: "art", label: "Arte" },
    { key: "story", label: "História" },
    { key: "characters", label: "Personagens" },
    { key: "pacing", label: "Ritmo" },
  ],
  Manhua: [
    { key: "art", label: "Arte" },
    { key: "story", label: "História" },
    { key: "characters", label: "Personagens" },
    { key: "pacing", label: "Ritmo" },
  ],
  Fanfic: [
    { key: "writing", label: "Escrita" },
    { key: "plot", label: "Roteiro" },
    { key: "characterization", label: "Caracterização" },
    { key: "emotion", label: "Emoção" },
  ],
  Série: [
    { key: "plot", label: "Roteiro" },
    { key: "acting", label: "Atuação" },
    { key: "production", label: "Produção" },
    { key: "soundtrack", label: "Trilha sonora" },
  ],
  Filme: [
    { key: "plot", label: "Roteiro" },
    { key: "acting", label: "Atuação" },
    { key: "direction", label: "Direção" },
    { key: "soundtrack", label: "Trilha sonora" },
  ],
  Livro: [
    { key: "writing", label: "Escrita" },
    { key: "plot", label: "Enredo" },
    { key: "characters", label: "Personagens" },
    { key: "pacing", label: "Ritmo" },
  ],
  Jogo: [
    { key: "gameplay", label: "Gameplay" },
    { key: "story", label: "História" },
    { key: "graphics", label: "Gráficos" },
    { key: "soundtrack", label: "Trilha sonora" },
  ],
  Webtoon: [
    { key: "art", label: "Arte" },
    { key: "story", label: "História" },
    { key: "characters", label: "Personagens" },
    { key: "pacing", label: "Ritmo" },
  ],
  "Light Novel": [
    { key: "writing", label: "Escrita" },
    { key: "plot", label: "Enredo" },
    { key: "characters", label: "Personagens" },
    { key: "worldbuilding", label: "Worldbuilding" },
  ],
  Donghua: [
    { key: "animation", label: "Animação" },
    { key: "story", label: "História" },
    { key: "soundtrack", label: "Trilha sonora" },
    { key: "characters", label: "Personagens" },
  ],
  HQ: [
    { key: "art", label: "Arte" },
    { key: "plot", label: "Roteiro" },
    { key: "characters", label: "Personagens" },
    { key: "pacing", label: "Ritmo" },
  ],
  Dorama: [
    { key: "plot", label: "Roteiro" },
    { key: "acting", label: "Atuação" },
    { key: "chemistry", label: "Química do casal" },
    { key: "soundtrack", label: "Trilha sonora" },
  ],
  Música: [
    { key: "lyrics", label: "Letra" },
    { key: "production", label: "Produção" },
    { key: "vocals", label: "Vocal/Interpretação" },
    { key: "replay", label: "Vontade de repetir" },
  ],
  Vídeos: [
    { key: "content", label: "Conteúdo" },
    { key: "editing", label: "Edição" },
    { key: "humor", label: "Humor/Emoção" },
    { key: "replay", label: "Vontade de assistir de novo" },
  ],
  "Gacha Videos": [
    { key: "story", label: "História/Roteiro" },
    { key: "editing", label: "Edição" },
    { key: "characters", label: "Personagens/OCs" },
    { key: "emotion", label: "Emoção" },
  ],
};

export const RELATION_TYPES = [
  "Sequência",
  "Prequela",
  "Spin-off",
  "Remake",
  "Relacionado",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export interface RelatedWork {
  id?: string;
  title: string;
  type: MediaType;
  cover?: string;
  relation: RelationType;
  source: "library" | "recommendations";
}

// Fandoms populares para sugestão no campo de Fanfic
export const POPULAR_FANDOMS = [
  "Naruto",
  "One Piece",
  "Attack on Titan",
  "Demon Slayer",
  "My Hero Academia",
  "Dragon Ball",
  "Bleach",
  "Fullmetal Alchemist",
  "Hunter x Hunter",
  "Death Note",
  "Sword Art Online",
  "Re:Zero",
  "Tokyo Ghoul",
  "Fairy Tail",
  "Black Clover",
  "Harry Potter",
  "Marvel",
  "DC",
  "Game of Thrones",
  "The Witcher",
  "K-pop",
  "BTS",
  "BLACKPINK",
  "Stray Kids",
];
