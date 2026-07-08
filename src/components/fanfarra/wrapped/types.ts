export interface WrappedData {
  year: number;
  userName: string;
  favoriteType: { icon: string; name: string; count: number };
  favoriteWork: { title: string; rating: number; status: string };
  topGenres: { name: string; pct: number }[];
  stats: { works: number; hours: number; chapters: number; gamesBeaten: number };
  streak: number;
  achievements: { emoji: string; name: string }[];
}
