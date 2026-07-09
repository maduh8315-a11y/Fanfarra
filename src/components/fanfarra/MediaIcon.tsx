import {
  Tv,
  Clapperboard,
  CirclePlay,
  Drama,
  Film,
  Video,
  BookOpen,
  GalleryVertical,
  PanelsTopLeft,
  Newspaper,
  Scroll,
  BookImage,
  Book,
  Feather,
  Gamepad2,
  Dices,
  Music,
  type LucideIcon,
} from "lucide-react";
import type { MediaType } from "@/lib/fanfarra/types";

const MAP: Record<MediaType, LucideIcon> = {
  Anime: Tv,
  Série: Clapperboard,
  Donghua: CirclePlay,
  Dorama: Drama,
  Filme: Film,
  Vídeos: Video,
  Manga: BookOpen,
  Manhwa: GalleryVertical,
  Manhua: PanelsTopLeft,
  HQ: Newspaper,
  Webtoon: Scroll,
  "Light Novel": BookImage,
  Livro: Book,
  Fanfic: Feather,
  Jogo: Gamepad2,
  "Gacha Videos": Dices,
  Música: Music,
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