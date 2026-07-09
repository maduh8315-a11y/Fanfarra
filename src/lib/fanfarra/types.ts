export const MEDIA_TYPES = [
  "Anime",
  "Manga",
  "Manhwa",
  "Manhua",
  "Fanfic",
  "Série",
  "Filme",
  "Livro",
  "Jogo",
  "Webtoon",
  "Light Novel",
  "Donghua",
  "HQ",
  "Dorama",
  "Música",
  "Vídeos",
  "Gacha Videos",
] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

export const STATUSES = [
  "Consumindo",
  "Quero consumir",
  "Assistindo",
  "Quero assistir",
  "Assistido",
  "Lendo",
  "Quero ler",
  "Jogando",
  "Quero jogar",
  "Platinado",
  "Pausado",
  "Abandonado",
  "Concluído",
  "Ouvindo",
  "Quero ouvir",
  "Ouvido",
] as const;

export type Status = (typeof STATUSES)[number];

// ===== Modo de consumo — agrupa os tipos por "como" você consome =====
export const MEDIA_MODES = ["Ler", "Assistir", "Jogar", "Ouvir"] as const;
export type MediaMode = (typeof MEDIA_MODES)[number];

export const MODE_ICONS: Record<MediaMode, string> = {
  Ler: "📖",
  Assistir: "🎬",
  Jogar: "🎮",
  Ouvir: "🎧",
};

export const MODE_LABELS: Record<MediaMode, string> = {
  Ler: "Leitura",
  Assistir: "Assistir",
  Jogar: "Jogos",
  Ouvir: "Áudio",
};

export const MODE_OF_TYPE: Record<MediaType, MediaMode> = {
  Manga: "Ler",
  Manhwa: "Ler",
  Manhua: "Ler",
  Fanfic: "Ler",
  Livro: "Ler",
  Webtoon: "Ler",
  "Light Novel": "Ler",
  HQ: "Ler",
  Anime: "Assistir",
  Série: "Assistir",
  Filme: "Assistir",
  Donghua: "Assistir",
  Dorama: "Assistir",
  Vídeos: "Assistir",
  "Gacha Videos": "Assistir",
  Jogo: "Jogar",
  Música: "Ouvir",
};

export const MODE_STATUSES: Record<MediaMode, readonly Status[]> = {
  Ler: ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  Assistir: ["Assistindo", "Quero assistir", "Assistido", "Pausado", "Abandonado", "Concluído"],
  Jogar: ["Jogando", "Quero jogar", "Platinado", "Pausado", "Abandonado", "Concluído"],
  Ouvir: ["Ouvindo", "Quero ouvir", "Ouvido"],
};

export interface DateParts {
  d?: number;
  m?: number;
  y?: number;
}

export interface Work {
  id: string;
  title: string;
  type: MediaType;
  status: Status;
  current: number;
  total: number;
  rating: number; // 0-5
  notes: string;
  cover?: string;
  startDate?: DateParts;
  endDate?: DateParts;
  genres?: string[];
  link?: string;
  details?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  // Recomendação pública — ativar quando Firebase estiver pronto
  isPublicRec?: boolean;
  recommendedBy?: string; // @username de quem publicou
}

export const STATUS_COLORS: Record<Status, { bg: string; fg: string }> = {
  Consumindo: { bg: "#1F3A1F", fg: "#4ADE80" },
  "Quero consumir": { bg: "var(--fan-bg-2)", fg: "var(--fan-pink-light)" },
  Assistindo: { bg: "#1F3A1F", fg: "#4ADE80" },
  "Quero assistir": { bg: "var(--fan-bg-2)", fg: "var(--fan-pink-light)" },
  Assistido: { bg: "#0A2A1E", fg: "#34D399" },
  Lendo: { bg: "#1F3A1F", fg: "#4ADE80" },
  "Quero ler": { bg: "var(--fan-bg-2)", fg: "var(--fan-pink-light)" },
  Jogando: { bg: "#1F3A1F", fg: "#4ADE80" },
  "Quero jogar": { bg: "var(--fan-bg-2)", fg: "var(--fan-pink-light)" },
  Platinado: { bg: "#2A1A3A", fg: "#C084FC" },
  Pausado: { bg: "#3A2A0A", fg: "#F59E0B" },
  Abandonado: { bg: "#3A0000", fg: "#F87171" },
  Concluído: { bg: "#0A2A1E", fg: "#34D399" },
  Ouvindo: { bg: "#1F3A1F", fg: "#4ADE80" },
  "Quero ouvir": { bg: "var(--fan-bg-2)", fg: "var(--fan-pink-light)" },
  Ouvido: { bg: "#0A2A1E", fg: "#34D399" },
};
// Status options per media type (shown in the add/edit form)
export const TYPE_STATUSES: Record<MediaType, readonly Status[]> = {
  Anime: ["Assistindo", "Quero assistir", "Pausado", "Abandonado", "Concluído"],
  Manga: ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  Manhwa: ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  Manhua: ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  Fanfic: ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  Série: ["Assistindo", "Quero assistir", "Pausado", "Abandonado", "Concluído"],
  Filme: ["Assistido", "Quero assistir"],
  Livro: ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  Jogo: ["Jogando", "Quero jogar", "Pausado", "Abandonado", "Concluído", "Platinado"],
  Webtoon: ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  "Light Novel": ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  Donghua: ["Assistindo", "Quero assistir", "Pausado", "Abandonado", "Concluído"],
  HQ: ["Lendo", "Quero ler", "Pausado", "Abandonado", "Concluído"],
  Dorama: ["Assistindo", "Quero assistir", "Pausado", "Abandonado", "Concluído"],
  Música: ["Ouvindo", "Quero ouvir", "Ouvido"],
  Vídeos: ["Assistindo", "Quero assistir", "Pausado", "Abandonado", "Concluído"],
  "Gacha Videos": ["Assistindo", "Quero assistir", "Pausado", "Abandonado", "Concluído"],
};

// "Group" statuses for home screen sections (in-progress / wishlist / done)
export const IN_PROGRESS_STATUSES: readonly Status[] = [
  "Consumindo",
  "Assistindo",
  "Lendo",
  "Jogando",
  "Ouvindo",
];
export const WISHLIST_STATUSES: readonly Status[] = [
  "Quero consumir",
  "Quero assistir",
  "Quero ler",
  "Quero jogar",
  "Quero ouvir",
];
export const COMPLETED_STATUSES: readonly Status[] = [
  "Concluído",
  "Assistido",
  "Platinado",
  "Ouvido",
];
export const DEFAULT_STATUS_FOR_TYPE = (t: MediaType): Status =>
  TYPE_STATUSES[t][1] ?? TYPE_STATUSES[t][0];

// ===== Field schema per media type =====

export type FieldDef =
  | { kind: "number"; key: string; label: string; placeholder?: string }
  | { kind: "text"; key: string; label: string; placeholder?: string }
  | { kind: "url"; key: string; label: string; placeholder?: string }
  | { kind: "toggle"; key: string; label: string }
  | { kind: "slider"; key: string; label: string; min: number; max: number }
  | {
      kind: "chips";
      key: string;
      label: string;
      options: readonly string[];
      multi?: boolean;
    }
  | { kind: "date"; key: string; label: string };

export const TYPE_FIELDS: Record<MediaType, FieldDef[]> = {
  Anime: [
    { kind: "number", key: "episode", label: "Episódio atual" },
    { kind: "text", key: "totalEpisodes", label: "Total de episódios (número ou ?)" },
    { kind: "number", key: "season", label: "Temporada atual" },
    { kind: "number", key: "totalSeasons", label: "Total de temporadas" },
    {
      kind: "chips",
      key: "format",
      label: "Tipo",
      options: ["TV", "Filme", "OVA", "ONA", "Especial"],
    },
    { kind: "text", key: "studio", label: "Estúdio (opcional)" },
    { kind: "url", key: "link", label: "Link MAL/AniList (opcional)" },
  ],
  Manga: [
    { kind: "number", key: "chapter", label: "Capítulo atual" },
    { kind: "text", key: "totalChapters", label: "Total de capítulos (número ou ?)" },
    { kind: "number", key: "volume", label: "Volume atual" },
    { kind: "text", key: "totalVolumes", label: "Total de volumes (número ou ?)" },
    { kind: "text", key: "serialization", label: "Serialização (opcional)" },
    { kind: "text", key: "author", label: "Autor (opcional)" },
    { kind: "url", key: "link", label: "Link MAL/MangaDex (opcional)" },
  ],
  Manhwa: [
    { kind: "number", key: "chapter", label: "Capítulo atual" },
    { kind: "text", key: "totalChapters", label: "Total de capítulos (número ou ?)" },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["Webtoon", "Kakao", "Naver", "Outro"],
    },
    { kind: "text", key: "author", label: "Autor (opcional)" },
    { kind: "url", key: "link", label: "Link da plataforma (opcional)" },
  ],
  Manhua: [
    { kind: "number", key: "chapter", label: "Capítulo atual" },
    { kind: "text", key: "totalChapters", label: "Total de capítulos (número ou ?)" },
    { kind: "text", key: "platform", label: "Plataforma (opcional)" },
    { kind: "text", key: "author", label: "Autor (opcional)" },
    { kind: "url", key: "link", label: "Link da plataforma (opcional)" },
  ],
  Fanfic: [
    { kind: "number", key: "chapter", label: "Capítulo atual" },
    { kind: "text", key: "totalChapters", label: "Total de capítulos (número ou ?)" },
    { kind: "text", key: "author", label: "Autor/escritor" },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["AO3", "Wattpad", "Fanfiction.net", "Spirit Fanfics", "Outro"],
    },
    {
      kind: "chips",
      key: "language",
      label: "Idioma",
      options: ["PT", "EN", "ES", "Outro"],
      multi: true,
    },
    { kind: "url", key: "link", label: "Link da fanfic (opcional)" },
  ],
  Série: [
    { kind: "number", key: "episode", label: "Episódio atual" },
    { kind: "text", key: "totalEpisodes", label: "Total de episódios (número ou ?)" },
    { kind: "number", key: "season", label: "Temporada atual" },
    { kind: "number", key: "totalSeasons", label: "Total de temporadas" },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["Netflix", "Disney+", "Prime", "HBO Max", "Globoplay", "Outro"],
      multi: true,
    },
    { kind: "url", key: "link", label: "Link da plataforma (opcional)" },
  ],
  Filme: [
    { kind: "toggle", key: "rewatch", label: "Reassistir" },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["Netflix", "Disney+", "Prime", "HBO Max", "Cinema", "Outro"],
      multi: true,
    },
    { kind: "url", key: "link", label: "Link do trailer (opcional)" },
  ],
  Livro: [
    { kind: "number", key: "page", label: "Página atual" },
    { kind: "number", key: "totalPages", label: "Total de páginas" },
    { kind: "text", key: "author", label: "Autor" },
    { kind: "text", key: "publisher", label: "Editora (opcional)" },
    { kind: "text", key: "isbn", label: "ISBN (opcional)" },
    { kind: "url", key: "link", label: "Link Goodreads/Amazon (opcional)" },
  ],
  Jogo: [
    { kind: "number", key: "hours", label: "Horas jogadas" },
    { kind: "slider", key: "completion", label: "% de conclusão", min: 0, max: 100 },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["PC", "PS5", "PS4", "Xbox", "Switch", "Mobile", "Outro"],
      multi: true,
    },
    { kind: "url", key: "link", label: "Link Steam/Epic (opcional)" },
  ],
  Webtoon: [
    { kind: "number", key: "episode", label: "Episódio atual" },
    { kind: "text", key: "totalEpisodes", label: "Total de episódios (número ou ?)" },
    { kind: "chips", key: "platform", label: "Plataforma", options: ["Webtoon", "Tapas", "Outro"] },
    { kind: "text", key: "author", label: "Autor (opcional)" },
    { kind: "url", key: "link", label: "Link da plataforma (opcional)" },
  ],
  "Light Novel": [
    { kind: "number", key: "volume", label: "Volume atual" },
    { kind: "text", key: "totalVolumes", label: "Total de volumes (número ou ?)" },
    { kind: "text", key: "author", label: "Autor (opcional)" },
    { kind: "text", key: "publisher", label: "Editora/Tradutora (opcional)" },
    { kind: "url", key: "link", label: "Link (opcional)" },
  ],
  Donghua: [
    { kind: "number", key: "episode", label: "Episódio atual" },
    { kind: "text", key: "totalEpisodes", label: "Total de episódios (número ou ?)" },
    { kind: "text", key: "studio", label: "Estúdio (opcional)" },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["Bilibili", "Crunchyroll", "YouTube", "Outro"],
      multi: true,
    },
    { kind: "url", key: "link", label: "Link da plataforma (opcional)" },
  ],
  HQ: [
    { kind: "number", key: "issue", label: "Issue/edição atual" },
    { kind: "text", key: "totalIssues", label: "Total de issues (número ou ?)" },
    { kind: "text", key: "publisher", label: "Editora (ex: Marvel, DC)" },
    { kind: "text", key: "author", label: "Autor/Roteirista (opcional)" },
    { kind: "url", key: "link", label: "Link (opcional)" },
  ],
  Dorama: [
    { kind: "number", key: "episode", label: "Episódio atual" },
    { kind: "text", key: "totalEpisodes", label: "Total de episódios (número ou ?)" },
    {
      kind: "chips",
      key: "country",
      label: "País",
      options: ["Coreia", "China", "Japão", "Tailândia", "Outro"],
    },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["Netflix", "Viki", "Kocowa", "Viu", "Disney+", "Outro"],
      multi: true,
    },
    { kind: "url", key: "link", label: "Link da plataforma (opcional)" },
  ],
  Música: [
    { kind: "text", key: "artist", label: "Artista/Banda" },
    { kind: "text", key: "album", label: "Álbum (opcional)" },
    { kind: "number", key: "plays", label: "Quantidade de escutas" },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["Spotify", "Apple Music", "YouTube Music", "Deezer", "Outro"],
      multi: true,
    },
    { kind: "url", key: "link", label: "Link da música/álbum (opcional)" },
  ],
  Vídeos: [
    { kind: "number", key: "part", label: "Vídeo/parte atual" },
    { kind: "text", key: "totalParts", label: "Total de vídeos/partes (número ou ?)" },
    {
      kind: "chips",
      key: "platform",
      label: "Plataforma",
      options: ["YouTube", "TikTok", "Twitch", "Instagram", "Outro"],
      multi: true,
    },
    { kind: "text", key: "creator", label: "Criador/Canal" },
    { kind: "url", key: "link", label: "Link do vídeo (opcional)" },
  ],
  "Gacha Videos": [
    {
      kind: "chips",
      key: "app",
      label: "App usado",
      options: ["Gacha Life", "Gacha Club", "Gacha Nebula", "Gacha Cute", "Outro"],
    },
    { kind: "text", key: "creator", label: "Criador/Canal" },
    { kind: "text", key: "saga", label: "Saga/Série (opcional)" },
    { kind: "number", key: "part", label: "Parte atual" },
    { kind: "text", key: "totalParts", label: "Total de partes (número ou ?)" },
    {
      kind: "chips",
      key: "genre",
      label: "Gênero",
      options: ["Reação", "Trend", "Skit/Comédia", "Drama/Angst", "Music Video", "Outro"],
      multi: true,
    },
    { kind: "url", key: "link", label: "Link do vídeo (opcional)" },
  ],
};

// "Current/total" projection per type — used by progress bar & cards
export function getProgressFields(type: MediaType): { current: string; total: string } {
  switch (type) {
    case "Anime":
    case "Série":
    case "Donghua":
    case "Webtoon":
    case "Dorama":
      return { current: "episode", total: "totalEpisodes" };
    case "Manhwa":
    case "Manhua":
    case "Fanfic":
      return { current: "chapter", total: "totalChapters" };
    case "Livro":
      return { current: "page", total: "totalPages" };
    case "Jogo":
      return { current: "hours", total: "" };
    case "Light Novel":
      return { current: "volume", total: "totalVolumes" };
    case "HQ":
      return { current: "issue", total: "totalIssues" };
    case "Música":
      return { current: "plays", total: "" };
      case "Vídeos":
    case "Gacha Videos":
      return { current: "part", total: "totalParts" };
    case "Filme":
      return { current: "", total: "" };
    default:
      return { current: "", total: "" };
  }
}
