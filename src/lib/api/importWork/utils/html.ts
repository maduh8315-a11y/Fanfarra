// Helpers genéricos para lidar com HTML bruto: fetch com User-Agent de
// navegador, decodificação de entidades, leitura de meta tags (Open Graph /
// Twitter Cards) e extração de sinopse do corpo da página.

export async function fetchHtml(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml",
            },
            redirect: "follow",
        });
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

export function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// Muitos sites (principalmente de streaming) cortam a meta description
// pra SEO (ex: só 155 caracteres), mas têm a sinopse completa no corpo da
// página, normalmente dentro de um contêiner com "sinopse"/"synopsis" no
// nome da classe, ou logo após um título "Sinopse"/"Synopsis".
export function extractBodySynopsis(html: string): string | undefined {
    // Remove trechos que não são conteúdo visível (script/style/head) pra
    // não confundir a busca com texto de tags de metadata, tipo
    // <meta name="description" ...>.
    const bodyHtml = html
        .replace(/<head[\s\S]*?<\/head>/i, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "");

    const KEYWORDS = "sinopse|synopsis|resumo|descri[cç][aã]o|overview|summary";

    const containerMatch =
        bodyHtml.match(
            new RegExp(
                `<div[^>]+(?:class|id)=["'][^"']*(?:${KEYWORDS})[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`,
                "i",
            ),
        )?.[1] ??
        bodyHtml.match(
            new RegExp(
                `<section[^>]+(?:class|id)=["'][^"']*(?:${KEYWORDS})[^"']*["'][^>]*>([\\s\\S]*?)<\\/section>`,
                "i",
            ),
        )?.[1] ??
        bodyHtml.match(
            new RegExp(
                `<p[^>]+(?:class|id)=["'][^"']*(?:${KEYWORDS})[^"']*["'][^>]*>([\\s\\S]*?)<\\/p>`,
                "i",
            ),
        )?.[1] ??
        bodyHtml.match(
            new RegExp(
                `<span[^>]+(?:class|id)=["'][^"']*(?:${KEYWORDS})[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`,
                "i",
            ),
        )?.[1] ??
        bodyHtml.match(/<[^>]+itemprop=["']description["'][^>]*>([\s\S]*?)<\/[^>]+>/i)?.[1];

    // Fallback: título "Sinopse"/"Resumo" seguido do texto, sem exigir que
    // esteja dentro de um <p> logo em seguida (alguns sites põem o texto
    // solto, sem parágrafo explícito).
    let headingMatch: string | undefined;
    if (!containerMatch) {
        const afterHeading = bodyHtml.match(
            new RegExp(
                `(?:${KEYWORDS})\\s*:?\\s*(?:<\\/[^>]+>)?\\s*([\\s\\S]{0,4000}?)(?=<h[1-6][^>]*>|$)`,
                "i",
            ),
        )?.[1];
        if (afterHeading) {
            const paragraphs = [...afterHeading.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
            headingMatch = paragraphs.length ? paragraphs.join(" ") : afterHeading;
        }
    }

    const raw = containerMatch ?? headingMatch;
    if (!raw) return undefined;

    const text = decodeHtmlEntities(
        raw
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " "),
    ).trim();

    return text.length >= 40 ? text.slice(0, 3000) : undefined;
}

// Escolhe o texto mais completo entre as fontes possíveis de resumo
// (meta description costuma vir cortada; o texto do corpo da página
// costuma ser o completo).
export function pickLongestText(...candidates: (string | undefined)[]): string | undefined {
    const valid = candidates.filter((c): c is string => !!c && c.trim().length > 0);
    if (!valid.length) return undefined;
    return valid.reduce((a, b) => (b.length > a.length ? b : a));
}

export function pickMeta(html: string, names: string[]): string | undefined {
    for (const name of names) {
        // Aceita atributos com aspas simples OU duplas, mas só encerra o valor
        // quando encontra a MESMA aspas usada para abrir — assim aspas/apóstrofos
        // dentro do próprio texto (comuns em resumos) não cortam o conteúdo.
        const patterns = [
            new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content="([^"]*)"`, "i"),
            new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content='([^']*)'`, "i"),
            new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)=["']${name}["']`, "i"),
            new RegExp(`<meta[^>]+content='([^']*)'[^>]+(?:property|name)=["']${name}["']`, "i"),
        ];
        for (const re of patterns) {
            const m = html.match(re);
            if (m?.[1]) return decodeHtmlEntities(m[1]).trim();
        }
    }
    return undefined;
}

export function htmlTitleTag(html: string): string | undefined {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1] ? decodeHtmlEntities(m[1]).trim() : undefined;
}

// Busca o primeiro padrão que casar numa lista de regexes — usado pelos
// parsers de scraping (AO3, Fanfiction.net, Spirit Fanfics, MyDramaList...)
// já que cada site pode ter variações de HTML pro mesmo campo.
export function firstMatch(html: string, patterns: RegExp[]): RegExpMatchArray | undefined {
    for (const re of patterns) {
        const m = html.match(re);
        if (m) return m;
    }
    return undefined;
}