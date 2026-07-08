import {
  Tv,
  BookOpen,
  BookMarked,
  Film,
  Book,
  Gamepad2,
  Feather,
  Scroll,
  Sparkles,
  Music,
  Clapperboard,
  Dices,
  type LucideIcon,
} from "lucide-react";
import type { MediaType } from "@/lib/fanfarra/types";

const MAP: Record<MediaType, LucideIcon> = {
  Anime: Tv,
  Manga: BookOpen,
  Manhwa: BookOpen,
  Manhua: BookOpen,
  Fanfic: Feather,
  Série: Tv,
  Filme: Film,
  Livro: Book,
  Jogo: Gamepad2,
  Webtoon: Scroll,
  "Light Novel": BookMarked,
  Donghua: Tv,
  HQ: Sparkles,
  Dorama: Tv,
  Música: Music,
  Vídeos: Clapperboard,
  "Gacha Videos": Dices,
};

export function MediaIcon({
  type,
  size,
  color,
  className,
}: {
  type: MediaType;
  size: number;
  color?: string;
  className?: string;
}) {
  const Icon = MAP[type] ?? Tv;
  return <Icon size={size} color={color} strokeWidth={1.5} className={className} />;
}
