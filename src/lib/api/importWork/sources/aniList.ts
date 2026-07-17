import type { ImportedWorkData } from "../types";
import { decodeHtmlEntities } from "../utils/html";

// ─── AniList (GraphQL público, sem chave) ──────────────────────────────────
// URL anilist.co/manga/... também cobre Manhwa/Manhua/Webtoon nesse site.

interface AniListResponse {
    data?: {
        Media?: {
            title?: { romaji?: string; english?: string };
            coverImage?: { extraLarge?: string; large?: string };
            genres?: string[];
            episodes?: number;
            chapters?: number;
            volumes?: number;
            duration?: number;
            description?: string;
            startDate?: { year?: number };
            studios?: { nodes?: { name?: string }[] };
            staff?: { nodes?: { name?: { full?: string } }[] };
        };
    };
}

export async function fetchAniList(url: string): Promise<ImportedWorkData | null> {
    const m = url.match(/anilist\.co\/(anime|manga)\/(\d+)/i);
    if (!m) return null;
    const id = Number(m[2]);
    const query = `
    query ($id: Int) {
      Media(id: $id) {
        title { romaji english }
        coverImage { extraLarge large }
        genres
        episodes
        chapters
        volumes
        duration
        description(asHtml: false)
        startDate { year }
        studios(isMain: true) { nodes { name } }
        staff(perPage: 1) { nodes { name { full } } }
      }
    }
  `;
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query, variables: { id } }),
        });
        if (!res.ok) return null;
        const json: AniListResponse = await res.json();
        const media = json?.data?.Media;
        if (!media) return null;
        const rawDescription: string | undefined = media.description ?? undefined;
        const synopsis = rawDescription
            ? decodeHtmlEntities(
                rawDescription.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
            ).trim()
            : undefined;

        return {
            title: media.title?.english || media.title?.romaji,
            cover: media.coverImage?.extraLarge || media.coverImage?.large,
            genres: media.genres ?? [],
            totalEpisodes: media.episodes ?? undefined,
            totalChapters: media.chapters ?? undefined,
            totalVolumes: media.volumes ?? undefined,
            episodeDurationMinutes: typeof media.duration === "number" ? media.duration : undefined,
            releaseYear: media.startDate?.year ?? undefined,
            studio: media.studios?.nodes?.[0]?.name,
            author: media.staff?.nodes?.[0]?.name?.full,
            synopsis,
        };
    } catch {
        return null;
    }
}