import type { ImportedWorkData } from "../types";
import { fetchHtml, decodeHtmlEntities, pickMeta, htmlTitleTag, firstMatch } from "../utils/html";

// ─── Fanfiction.net (scraping do HTML clássico da FFN) ─────────────────────

export async function fetchFanfictionNet(url: string): Promise<ImportedWorkData | null> {
    if (!/fanfiction\.net\/s\/\d+/i.test(url)) return null;
    const html = await fetchHtml(url);
    if (!html) return null;

    const titleRaw = firstMatch(html, [
        /<b class="xcontrast_txt">\s*([^<]+?)\s*<\/b>/i,
        /<div[^>]+id="content"[^>]*>[\s\S]*?<b>\s*([^<]+?)\s*<\/b>/i,
    ])?.[1];
    const ogOrTagTitle = pickMeta(html, ["og:title"]) ?? htmlTitleTag(html);
    const title = titleRaw
        ? decodeHtmlEntities(titleRaw.trim())
        : ogOrTagTitle
            ? decodeHtmlEntities(ogOrTagTitle)
                .replace(/,\s*an?\s+.*$/i, "")
                .replace(/\s*\|\s*FanFiction\s*$/i, "")
                .trim()
            : undefined;
    if (!title) return null;

    const author = firstMatch(html, [
        /<a class="xcontrast_txt"[^>]+href="\/u\/\d+\/[^"]*"[^>]*>\s*([^<]+?)\s*<\/a>/i,
        /<a[^>]+href="\/u\/\d+\/[^"]*"[^>]*>\s*([^<]+?)\s*<\/a>/i,
    ])?.[1];

    const fandomBlock = html.match(/id="pre_story_links"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
    const fandomLinks = fandomBlock
        ? [...fandomBlock.matchAll(/<a[^>]*>\s*([^<]+?)\s*<\/a>/gi)].map((m) => m[1].trim())
        : [];
    const fandom = fandomLinks.length ? fandomLinks[fandomLinks.length - 1] : undefined;

    const infoLine =
        firstMatch(html, [
            /<span class="xgray xcontrast_txt">([\s\S]*?)<\/span>/i,
            /<span[^>]+class=["'][^"']*\bxgray\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
        ])?.[1]?.replace(/<[^>]+>/g, "") ?? "";

    const chaptersRaw = infoLine.match(/Chapters:\s*([\d,]+)/i)?.[1];
    const wordsRaw = infoLine.match(/Words:\s*([\d,]+)/i)?.[1];

    const summaryRaw = firstMatch(html, [
        /<div style=["']margin-top:2px["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]+class=["'][^"']*\bmarg-x\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ])?.[1];
    const synopsis = summaryRaw
        ? decodeHtmlEntities(summaryRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim()
        : pickMeta(html, ["og:description"]);

    return {
        title,
        author: author ? decodeHtmlEntities(author.trim()) : undefined,
        fandoms: fandom ? [decodeHtmlEntities(fandom)] : undefined,
        totalChapters: chaptersRaw ? Number(chaptersRaw.replace(/,/g, "")) : undefined,
        wordCount: wordsRaw ? Number(wordsRaw.replace(/,/g, "")) : undefined,
        synopsis,
        platform: "Fanfiction.net",
    };
}