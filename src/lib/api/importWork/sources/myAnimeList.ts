import type { ImportedWorkData } from "../types";

// ─── MyAnimeList (via Jikan, API pública sem chave) ────────────────────────
// Cobre Anime e Manga. Manhwa/Manhua ficam de fora aqui pois o MAL trata
// tudo como "manga" — quando o link é do MAL, o parser roda igual.

interface JikanResponse {
    data?: {
        title?: string;
        images?: { jpg?: { large_image_url?: string; image_url?: string } };
        genres?: { name: string }[];
        themes?: { name: string }[];
        year?: number;
        published?: { prop?: { from?: { year?: number } } };
        aired?: { prop?: { from?: { year?: number } } };
        synopsis?: string;
        studios?: { name?: string }[];
        episodes?: number;
        duration?: string;
        authors?: { name?: string }[];
        chapters?: number;
        volumes?: number;
    };
}

export async function fetchJikan(url: string): Promise<ImportedWorkData | null> {
    const m = url.match(/myanimelist\.net\/(anime|manga)\/(\d+)/i);
    if (!m) return null;
    const kind = m[1] as "anime" | "manga";
    try {
        const res = await fetch(`https://api.jikan.moe/v4/${kind}/${m[2]}/full`);
        if (!res.ok) return null;
        const json: JikanResponse = await res.json();
        const d = json?.data;
        if (!d) return null;
        const genres = [...(d.genres ?? []), ...(d.themes ?? [])].map((g) => g.name);
        const base: ImportedWorkData = {
            title: d.title,
            cover: d.images?.jpg?.large_image_url ?? d.images?.jpg?.image_url,
            genres,
            releaseYear: d.year ?? d.published?.prop?.from?.year ?? d.aired?.prop?.from?.year,
            synopsis: typeof d.synopsis === "string" ? d.synopsis.trim() : undefined,
        };
        if (kind === "anime") {
            base.studio = d.studios?.[0]?.name;
            base.totalEpisodes = typeof d.episodes === "number" ? d.episodes : undefined;
            // d.duration vem como texto, ex: "24 min per ep"
            const durMatch = typeof d.duration === "string" ? d.duration.match(/(\d+)\s*hr/i) : null;
            const durMinMatch = typeof d.duration === "string" ? d.duration.match(/(\d+)\s*min/i) : null;
            const durHours = durMatch ? Number(durMatch[1]) : 0;
            const durMinutes = durMinMatch ? Number(durMinMatch[1]) : 0;
            if (durHours || durMinutes) base.episodeDurationMinutes = durHours * 60 + durMinutes;
        } else {
            base.author = d.authors?.[0]?.name;
            base.totalChapters = typeof d.chapters === "number" ? d.chapters : undefined;
            base.totalVolumes = typeof d.volumes === "number" ? d.volumes : undefined;
        }
        return base;
    } catch {
        return null;
    }
}