export interface WrappedData {
  year: number;
  userName: string;
  favoriteType: { type: import("@/lib/fanfarra/types").MediaType | null; name: string; count: number };
  favoriteWork: { title: string; rating: number; status: string };
  topGenres: { name: string; pct: number }[];
  stats: { works: number; hours: number; chapters: number; gamesBeaten: number };
  streak: number;
  achievements: { Icon: import("lucide-react").LucideIcon; name: string }[];
}
