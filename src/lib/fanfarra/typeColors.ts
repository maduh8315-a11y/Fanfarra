import type { MediaType } from "./types";

// Paleta por tipo de obra — leitura em tons quentes, assistir em tons frios,
// jogo/música isolados. Funciona em todos os temas e nos modos claro/escuro
// porque as cores ficam numa faixa de claridade média (nem clara nem escura
// demais), o que segura contraste tanto em fundo quase-preto quanto em fundo
// creme/branco.
export const TYPE_COLORS: Record<MediaType, string> = {
  // Leitura
  Manga: "#F61E1E",
  Livro: "#F2460D",
  Manhwa: "#FF8C00",
  Manhua: "#E5BC06",
  HQ: "#F6235F",
  Webtoon: "#E225F4",
  Fanfic: "#F434D1",
  "Light Novel": "#EF399D",
  // Assistir
  Donghua: "#15C149",
  Série: "#0FBD8E",
  Anime: "#0BB0D5",
  Filme: "#166BF3",
  Vídeos: "#4539EF",
  "Gacha Videos": "#4539EF",
  Dorama: "#8F2FEE",
  // Isolados
  Jogo: "#90C610",
  Música: "#20BB1B",
};

export function getTypeColor(type: MediaType): string {
  return TYPE_COLORS[type] ?? "var(--fan-icon-blue)";
}

// Fundo de card: uma fatia bem leve da cor do tipo, misturada com o fundo
// do card do tema atual — por isso funciona em todos os temas sem precisar
// de valores separados por tema.
export function getTypeCardBg(type: MediaType): string {
  return `color-mix(in srgb, ${getTypeColor(type)} 14%, var(--fan-bg-2))`;
}

export function getTypeCardBorder(type: MediaType): string {
  return `color-mix(in srgb, ${getTypeColor(type)} 45%, transparent)`;
}