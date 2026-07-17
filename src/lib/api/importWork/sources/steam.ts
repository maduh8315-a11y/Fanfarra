import type { ImportedWorkData } from "../types";

// ─── Steam (API appdetails pública, sem chave) — para Jogo ────────────────

interface SteamAppDetails {
    success?: boolean;
    data?: {
        name?: string;
        header_image?: string;
        genres?: { description?: string }[];
        release_date?: { date?: string };
        short_description?: string;
    };
}
type SteamAppDetailsResponse = Record<string, SteamAppDetails>;

export async function fetchSteam(url: string): Promise<ImportedWorkData | null> {
    const m = url.match(/store\.steampowered\.com\/app\/(\d+)/i);
    if (!m) return null;
    try {
        const res = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${m[1]}&l=portuguese`,
        );
        if (!res.ok) return null;
        const json: SteamAppDetailsResponse = await res.json();
        const entry = json?.[m[1]];
        if (!entry?.success || !entry.data) return null;
        const d = entry.data;

        let releaseYear: number | undefined;
        const dateStr: string | undefined = d.release_date?.date;
        if (dateStr) {
            const yMatch = dateStr.match(/(\d{4})/);
            if (yMatch) releaseYear = Number(yMatch[1]);
        }

        return {
            title: d.name,
            cover: d.header_image,
            genres: Array.isArray(d.genres)
                ? d.genres.map((g) => g.description).filter((g): g is string => Boolean(g))
                : undefined,
            synopsis: typeof d.short_description === "string" ? d.short_description.trim() : undefined,
            platform: "PC",
        };
    } catch {
        return null;
    }
}