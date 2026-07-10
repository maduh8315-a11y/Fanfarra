import { BookOpen, Clapperboard, Gamepad2, Headphones, type LucideIcon } from "lucide-react";
import type { MediaMode } from "@/lib/fanfarra/types";

const MAP: Record<MediaMode, LucideIcon> = {
  Ler: BookOpen,
  Assistir: Clapperboard,
  Jogar: Gamepad2,
  Ouvir: Headphones,
};

export function ModeIcon({
  mode,
  size,
  color,
  className,
}: {
  mode: MediaMode;
  size: number;
  color?: string;
  className?: string;
}) {
  const Icon = MAP[mode];
  return <Icon size={size} color={color} strokeWidth={1.75} className={className} />;
}