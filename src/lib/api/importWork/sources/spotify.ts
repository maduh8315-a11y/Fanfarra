import type { ImportedWorkData } from "../types";

// ─── Spotify (oEmbed público, sem chave) ───────────────────────────────────

interface SpotifyOEmbedResponse {
    title?: string;
    thumbnail_url?: string;
}

export async function fetchSpotify(url: string): Promise<ImportedWorkData | null> {
    if (!/open\.spotify\.com/i.test(url)) return null;
    try {
        const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
        if (!res.ok) return null;
        const json: SpotifyOEmbedResponse = await res.json();
        if (!json?.title) return null;
        return { title: json.title, cover: json.thumbnail_url, platform: "Spotify" };
    } catch {
        return null;
    }
}