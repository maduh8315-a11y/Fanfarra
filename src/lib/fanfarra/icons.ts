import {
  Droplets, Flame, Angry, Skull, Repeat, Moon, Zap, Heart,
  PenLine, BookOpen, Drama, Ban, ThumbsDown, TrendingDown,
  Gamepad2, Palette, HeartHandshake, Headphones, Music2, Laugh, Sparkles,
  type LucideIcon,
} from "lucide-react";

export const REACTION_ICON_MAP: Record<string, LucideIcon> = {
  "😭": Droplets,
  "🔥": Flame,
  "😤": Angry,
  "💀": Skull,
  "🔁": Repeat,
  "😴": Moon,
  "🤯": Zap,
  "❤️": Heart,
  "✍️": PenLine,
  "📖": BookOpen,
  "🔞": Drama,
  "🚫": Ban,
  "👎": ThumbsDown,
  "📉": TrendingDown,
  "🎮": Gamepad2,
  "🎨": Palette,
  "🥰": HeartHandshake,
  "🎧": Headphones,
  "💃": Music2,
  "😂": Laugh,
};

export function splitReaction(r: string): { Icon: LucideIcon; label: string } {
  const [emoji, ...rest] = r.split(" ");
  return { Icon: REACTION_ICON_MAP[emoji] ?? Sparkles, label: rest.join(" ") };
}