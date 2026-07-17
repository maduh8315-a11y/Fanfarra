import type { ImportedWorkData } from "../types";
import { fetchHtml, pickMeta, htmlTitleTag, decodeHtmlEntities, extractBodySynopsis, pickLongestText, firstMatch } from "../utils/html";
import { extractJsonLd } from "../utils/jsonLd";

// ─── MyDramaList (scraping best-effort) — para Dorama ──────────────────────

function countryToPtBr(raw: string): string | undefined {
    const map: Record<string, string> = {
        "south korea": "Coreia",
        korea: "Coreia",
        china: "China",
        japan: "Japão",
        thailand: "Tailândia",
    };
    return map[raw.trim().toLowerCase()];
}

export async function fetchMyDramaList(url: string): Promise<ImportedWorkData | null> {
    if (!/mydramalist\.com/i.test(url)) return null;
    const html = await fetchHtml(url);
    if (!html) return null;

    const ogTitle = pickMeta(html, ["og:title"]) ?? htmlTitleTag(html);
    const cover = pickMeta(html, ["og:image"]);
    const description = pickMeta(html, ["og:description", "description"]);
    const bodySynopsis = extractBodySynopsis(html);
    const jsonLd = extractJsonLd(html);
    const title = ogTitle
        ? decodeHtmlEntities(ogTitle).replace(/\s*-\s*MyDramaList$/i, "")
        : jsonLd?.title;
    if (!title && !cover) return null;

    const countryRaw = firstMatch(html, [
        /Country:\s*<\/b>\s*<a[^>]*>\s*([^<]+?)\s*<\/a>/i,
        /Country:\s*<\/b>\s*([^<]+?)\s*</i,
        /Country:\s*<\/(?:span|strong)>\s*(?:<a[^>]*>)?\s*([^<]+?)\s*</i,
    ])?.[1];

    const episodesRaw = firstMatch(html, [
        /Episodes:\s*<\/b>\s*([^<]+?)\s*</i,
        /Episodes:\s*<\/(?:span|strong)>\s*([^<]+?)\s*</i,
    ])?.[1];

    return {
        title,
        cover: cover ?? jsonLd?.cover,
        genres: jsonLd?.genres,
        totalEpisodes: episodesRaw ? Number(episodesRaw.replace(/\D/g, "")) || undefined : undefined,
        country: countryRaw ? countryToPtBr(countryRaw.trim()) : undefined,
        synopsis: pickLongestText(bodySynopsis, description, jsonLd?.synopsis),
        platform: "MyDramaList",
    };
}