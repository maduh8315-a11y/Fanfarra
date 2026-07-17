import type { ImportedWorkData } from "../types";
import { fetchHtml, decodeHtmlEntities, pickMeta, htmlTitleTag, extractBodySynopsis, firstMatch } from "../utils/html";
import { extractJsonLd } from "../utils/jsonLd";

// ─── Spirit Fanfics (scraping best-effort, sem API pública) ───────────────

export async function fetchSpiritFanfics(url: string): Promise<ImportedWorkData | null> {
    if (!/spiritfanfics\.com/i.test(url)) return null;
    const html = await fetchHtml(url);
    if (!html) return null;

    const title = pickMeta(html, ["og:title"]) ?? htmlTitleTag(html);
    const cover = pickMeta(html, ["og:image"]);
    if (!title && !cover) return null;

    const jsonLd = extractJsonLd(html);
    const description =
        pickMeta(html, ["og:description", "description"]) ?? extractBodySynopsis(html) ?? jsonLd?.synopsis;

    const authorRaw = firstMatch(html, [
        /<a[^>]+href="\/(?:user|perfil|autor|profile)\/[^"]+"[^>]*>\s*([^<]+?)\s*<\/a>/i,
        /<span[^>]+class=["'][^"']*\bauthor\b[^"']*["'][^>]*>\s*([^<]+?)\s*<\/span>/i,
    ])?.[1];

    const fandoms = [
        ...html.matchAll(/<a[^>]+href="\/(?:fandom|categoria)\/[^"]+"[^>]*>\s*([^<]+?)\s*<\/a>/gi),
    ].map((m) => decodeHtmlEntities(m[1].trim()));

    const chaptersRaw = firstMatch(html, [
        /Cap[ií]tulos?\s*[:-]?\s*(\d+)/i,
        /<span[^>]+class=["'][^"']*\bchapters?\b[^"']*["'][^>]*>\s*(\d+)/i,
    ])?.[1];

    return {
        title: title ? decodeHtmlEntities(title) : undefined,
        cover: cover ?? jsonLd?.cover,
        author: authorRaw ? decodeHtmlEntities(authorRaw.trim()) : jsonLd?.author,
        fandoms: fandoms.length ? fandoms : undefined,
        totalChapters: chaptersRaw ? Number(chaptersRaw) : undefined,
        synopsis: description,
        platform: "Spirit Fanfics",
    };
}