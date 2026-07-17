import type { ImportedWorkData } from "./types";
import { fetchHtml, pickMeta, htmlTitleTag, extractBodySynopsis, pickLongestText } from "./utils/html";
import { extractJsonLd } from "./utils/jsonLd";

// ─── Fallback genérico (Open Graph / meta tags / JSON-LD) ──────────────────
// Usado quando a URL não bate com nenhum parser específico, ou quando o
// parser específico falha em extrair dados (site mudou o layout).
export async function genericOgImport(url: string): Promise<ImportedWorkData | null> {
    const html = await fetchHtml(url);
    if (!html) return null;

    const title = pickMeta(html, ["og:title", "twitter:title"]) ?? htmlTitleTag(html);
    const cover = pickMeta(html, ["og:image", "twitter:image", "twitter:image:src"]);
    const description = pickMeta(html, ["og:description", "twitter:description", "description"]);
    const bodySynopsis = extractBodySynopsis(html);
    const jsonLd = extractJsonLd(html);

    // Heurística genérica para sites de streaming que não têm JSON-LD com
    // contagem de episódios/temporadas (ex: "Temporada 1", "Episodio 12"...).
    const seasonMatches = [...html.matchAll(/Temporadas?\s*[:-]?\s*(\d+)/gi)].map((m) => Number(m[1]));

    const guessedSeasons = seasonMatches.length ? Math.max(...seasonMatches) : undefined;

    const epMatches = [
        ...html.matchAll(/Epis[oó]dios?\s*[:-]?\s*(\d+)/gi),
        ...html.matchAll(/\bEp\s*[-:]?\s*(\d+)\b/gi),
    ].map((m) => Number(m[1]));
    const guessedEpisodes = epMatches.length ? Math.max(...epMatches) : undefined;

    const merged: ImportedWorkData = {
        title: title ?? jsonLd?.title,
        cover: cover ?? jsonLd?.cover,
        genres: jsonLd?.genres,
        author: jsonLd?.author,
        publisher: jsonLd?.publisher,
        isbn: jsonLd?.isbn,
        releaseYear: jsonLd?.releaseYear,
        totalEpisodes: jsonLd?.totalEpisodes ?? guessedEpisodes,
        totalSeasons: guessedSeasons,
        durationMinutes: jsonLd?.durationMinutes,
        synopsis: pickLongestText(bodySynopsis, description, jsonLd?.synopsis),
    };

    if (!merged.title && !merged.cover) return null;
    return merged;
}