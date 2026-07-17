import type { ImportedWorkData } from "../types";
import { fetchHtml, decodeHtmlEntities, pickMeta, extractBodySynopsis, firstMatch } from "../utils/html";

// ─── AO3 (Archive of Our Own) — scraping da página pública ────────────────
// A AO3 não tem API pública, então extraímos os dados direto do HTML. Sites
// assim podem mudar o layout a qualquer momento — por isso cada campo abaixo
// tenta MÚLTIPLOS padrões possíveis, e nenhum campo derruba os outros: se só
// o título mudar de classe, por exemplo, ainda conseguimos fandom, tags,
// palavras e capítulos normalmente.

// Extrai listas de tags da AO3 (fandom, relationship, character, freeform).
// Aceita qualquer combinação/ordem de classes no <dd>, então uma mudança
// como "fandom tags" -> "tags fandom" ou adição de classes extras não quebra.
function extractAO3TagList(html: string, ddClassKeyword: string): string[] | undefined {
    const block = html.match(
        new RegExp(
            `<dd[^>]+class=["'][^"']*\\b${ddClassKeyword}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/dd>`,
            "i",
        ),
    )?.[1];
    if (!block) return undefined;
    const items = [...block.matchAll(/<a[^>]+class=["'][^"']*\btag\b[^"']*["'][^>]*>([^<]+)<\/a>/gi)].map((m) =>
        decodeHtmlEntities(m[1].trim()),
    );
    return items.length ? items : undefined;
}

export async function fetchAO3(url: string): Promise<ImportedWorkData | null> {
    if (!/archiveofourown\.org\/works\/\d+/i.test(url)) return null;

    let fullUrl: string;
    try {
        const u = new URL(url);
        u.searchParams.set("view_adult", "true");
        u.searchParams.set("view_full_work", "true");
        fullUrl = u.toString();
    } catch {
        fullUrl = url;
    }

    const html = await fetchHtml(fullUrl);
    if (!html) return null;

    // ── Título ──
    // Tenta o <h2 class="title heading"> clássico (com variações de ordem
    // de classe) e, se não achar, cai pro og:title, removendo os sufixos
    // que a AO3 costuma colocar (ex: "- Chapter 3 - Archive of Our Own").
    const titleBlock = firstMatch(html, [
        /<h2[^>]+class=["'][^"']*\btitle\b[^"']*\bheading\b[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i,
        /<h2[^>]+class=["'][^"']*\bheading\b[^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i,
    ])?.[1];
    const ogTitle = pickMeta(html, ["og:title"]);
    const title = titleBlock
        ? decodeHtmlEntities(titleBlock.replace(/<[^>]+>/g, "").trim())
        : ogTitle
            ? decodeHtmlEntities(ogTitle)
                .replace(/\s*-\s*Chapter\s*\d+.*$/i, "")
                .replace(/\s*[|–-]\s*Archive of Our Own\s*$/i, "")
                .trim()
            : undefined;
    if (!title) return null;

    // ── Autor(es) ──
    const bylineBlock = firstMatch(html, [
        /<h3[^>]+class=["'][^"']*\bbyline\b[^"']*\bheading\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i,
    ])?.[1];
    let author: string | undefined;
    if (bylineBlock) {
        const authorLinks = [...bylineBlock.matchAll(/<a[^>]+rel=["']author["'][^>]*>([^<]+)<\/a>/gi)].map((m) =>
            decodeHtmlEntities(m[1].trim()),
        );
        author = authorLinks.length
            ? authorLinks.join(", ")
            : /anonymous/i.test(bylineBlock)
                ? "Anônimo"
                : undefined;
    }

    // ── Fandoms / Relacionamentos / Personagens / Tags livres ──
    const fandoms = extractAO3TagList(html, "fandom");
    const relationships = extractAO3TagList(html, "relationship");
    const characters = extractAO3TagList(html, "character");
    const freeformTags = extractAO3TagList(html, "freeform");
    const extraTags = [...(relationships ?? []), ...(characters ?? []), ...(freeformTags ?? [])];

    // ── Idioma ──
    const langRaw = firstMatch(html, [
        /<dd[^>]+class=["'][^"']*\blanguage\b[^"']*["'][^>]*>\s*([^<]+?)\s*<\/dd>/i,
        /Language:\s*<\/dt>\s*<dd[^>]*>\s*([^<]+?)\s*</i,
    ])?.[1]?.trim();

    // ── Palavras ──
    const wordsRaw = firstMatch(html, [
        /<dd[^>]+class=["'][^"']*\bwords\b[^"']*["'][^>]*>\s*([\d,]+)\s*<\/dd>/i,
        /Words:\s*<\/dt>\s*<dd[^>]*>\s*([\d,]+)/i,
    ])?.[1];
    const wordCount = wordsRaw ? Number(wordsRaw.replace(/,/g, "")) : undefined;

    // ── Capítulos ──
    const chaptersMatch = firstMatch(html, [
        /<dd[^>]+class=["'][^"']*\bchapters\b[^"']*["'][^>]*>\s*(?:<[^>]+>\s*)*(\d+)\s*(?:<\/[^>]+>\s*)*\/\s*(?:<[^>]+>\s*)*(\d+|\?)/i,
        /Chapters:\s*<\/dt>\s*<dd[^>]*>\s*(?:<[^>]+>\s*)*(\d+)\s*(?:<\/[^>]+>\s*)*\/\s*(?:<[^>]+>\s*)*(\d+|\?)/i,
    ]);
    const totalChapters = chaptersMatch && chaptersMatch[2] !== "?" ? Number(chaptersMatch[2]) : undefined;

    // ── Resumo ──
    const summaryRaw = firstMatch(html, [
        />Summary:<\/h3>\s*<blockquote[^>]+class=["'][^"']*\buserstuff\b[^"']*["'][^>]*>([\s\S]*?)<\/blockquote>/i,
        /<div[^>]+class=["'][^"']*\bsummary\b[^"']*\bmodule\b[^"']*["'][^>]*>[\s\S]*?<blockquote[^>]+class=["'][^"']*\buserstuff\b[^"']*["'][^>]*>([\s\S]*?)<\/blockquote>/i,
    ])?.[1];
    const synopsis = summaryRaw
        ? decodeHtmlEntities(summaryRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim()
        : (pickMeta(html, ["og:description"]) ?? extractBodySynopsis(html));

    return {
        title,
        author: author || undefined,
        fandoms,
        genres: freeformTags,
        tags: extraTags.length ? extraTags : undefined,
        language: langRaw ? [langRaw] : undefined,
        wordCount,
        totalChapters,
        synopsis,
        platform: "AO3",
    };
}