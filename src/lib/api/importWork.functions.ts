import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { POPULAR_FANDOMS } from "@/lib/fanfarra/formConfig";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit.server";

// Máx. 20 importações a cada 10 minutos, por IP.
const IMPORT_LIMIT = 20;
const IMPORT_WINDOW_MS = 10 * 60 * 1000;

// ─── Tipos retornados pela importação ──────────────────────────────────────

export interface ImportedWorkData {
    title?: string;
    cover?: string;
    genres?: string[];
    author?: string;
    studio?: string;
    publisher?: string;
    isbn?: string;
    artist?: string;
    album?: string;
    country?: string;
    totalEpisodes?: number;
    totalChapters?: number;
    totalVolumes?: number;
    totalPages?: number;
    totalIssues?: number;
    totalSeasons?: number;
    durationMinutes?: number;
    episodeDurationMinutes?: number;
    releaseYear?: number;
    platform?: string;
    fandoms?: string[];
    language?: string[];
    wordCount?: number;
    synopsis?: string;
    tags?: string[];
}

export interface ImportResult {
    ok: boolean;
    error?: string;
    warning?: string;
    source?: string;
    data?: ImportedWorkData;
}

const inputSchema = z.object({
    url: z.string().url(),
    type: z.string(),
});

// ─── Helpers genéricos (Open Graph / meta tags / JSON-LD) ──────────────────

async function fetchHtml(url: string): Promise<string | null> {
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

function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// Sites como Wattpad misturam tudo em uma única lista de "tags" (gênero,
// fandom, tropes, etc). Em vez de jogar tudo no campo de Fandom, só
// aproveitamos as que reconhecemos de uma lista de fandoms populares —
// o resto continua disponível no campo de Tags, sem duplicar/confundir.
function guessFandomsFromTags(tags: string[] | undefined): string[] | undefined {
    if (!tags || !tags.length) return undefined;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matched = new Set<string>();
    for (const tag of tags) {
        const normTag = normalize(tag);
        if (!normTag) continue;
        for (const fandom of POPULAR_FANDOMS) {
            const normFandom = normalize(fandom);
            if (normTag === normFandom || normTag.includes(normFandom)) {
                matched.add(fandom);
            }
        }
    }
    return matched.size ? Array.from(matched) : undefined;
}

// Muitos sites (principalmente de streaming) cortam a meta description
// pra SEO (ex: só 155 caracteres), mas têm a sinopse completa no corpo da
// página, normalmente dentro de um contêiner com "sinopse"/"synopsis" no
// nome da classe, ou logo após um título "Sinopse"/"Synopsis".
function extractBodySynopsis(html: string): string | undefined {
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
function pickLongestText(...candidates: (string | undefined)[]): string | undefined {
    const valid = candidates.filter((c): c is string => !!c && c.trim().length > 0);
    if (!valid.length) return undefined;
    return valid.reduce((a, b) => (b.length > a.length ? b : a));
}

function pickMeta(html: string, names: string[]): string | undefined {
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

function htmlTitleTag(html: string): string | undefined {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1] ? decodeHtmlEntities(m[1]).trim() : undefined;
}

// Lê blocos <script type="application/ld+json"> (schema.org) presentes em muitos
// sites (filmes, livros, doramas, etc.) e converte pros nossos campos.
interface JsonLdNode {
    "@type"?: string;
    "@graph"?: JsonLdNode[];
    name?: string;
    image?: string | { url?: string } | Array<string | { url?: string }>;
    genre?: string | string[];
    author?: string | { name?: string } | Array<{ name?: string }>;
    datePublished?: string;
    numberOfEpisodes?: number | string;
    duration?: string;
    publisher?: { name?: string };
    isbn?: string;
    description?: string;
}

function extractJsonLd(html: string): Partial<ImportedWorkData> | null {
    const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const block of blocks) {
        try {
            let json: JsonLdNode | JsonLdNode[] = JSON.parse(block[1].trim());
            if (Array.isArray(json)) json = json.find((j) => j?.["@type"]) ?? json[0];
            if (!Array.isArray(json) && json?.["@graph"]) json = json["@graph"]?.find((g) => g?.name) ?? json;
            if (!json || typeof json !== "object" || Array.isArray(json)) continue;

            const data: Partial<ImportedWorkData> = {};

            if (typeof json.name === "string") data.title = json.name;

            const img = json.image;
            if (typeof img === "string") data.cover = img;
            else if (img && !Array.isArray(img) && img.url) data.cover = img.url;
            else if (Array.isArray(img) && img[0]) data.cover = typeof img[0] === "string" ? img[0] : img[0]?.url;

            if (Array.isArray(json.genre)) data.genres = json.genre;
            else if (typeof json.genre === "string") data.genres = [json.genre];

            const author = json.author;
            if (Array.isArray(author)) data.author = author.map((a) => a?.name).filter(Boolean).join(", ");
            else if (author && typeof author === "object" && author.name) data.author = author.name;
            else if (typeof author === "string") data.author = author;

            if (json.datePublished) {
                const y = parseInt(String(json.datePublished).slice(0, 4), 10);
                if (!isNaN(y)) data.releaseYear = y;
            }

            if (typeof json.numberOfEpisodes === "number" || typeof json.numberOfEpisodes === "string") {
                const n = Number(json.numberOfEpisodes);
                if (!isNaN(n)) data.totalEpisodes = n;
            }

            if (typeof json.duration === "string") {
                const dm = json.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
                if (dm) data.durationMinutes = parseInt(dm[1] || "0", 10) * 60 + parseInt(dm[2] || "0", 10);
            }

            if (json.publisher?.name) data.publisher = json.publisher.name;
            if (json.isbn) data.isbn = json.isbn;
            if (typeof json.description === "string") data.synopsis = json.description.trim();

            if (Object.keys(data).length > 0) return data;
        } catch {
            // ignora bloco JSON-LD inválido e tenta o próximo
        }
    }
    return null;
}

async function genericOgImport(url: string): Promise<ImportedWorkData | null> {
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

async function fetchJikan(url: string): Promise<ImportedWorkData | null> {
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

// ─── AniList (GraphQL público, sem chave) ──────────────────────────────────
// URL anilist.co/manga/... também cobre Manhwa/Manhua/Webtoon nesse site.

async function fetchAniList(url: string): Promise<ImportedWorkData | null> {
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
interface GoogleBooksResponse {
    volumeInfo?: {
        title?: string;
        imageLinks?: { thumbnail?: string };
        categories?: string[];
        authors?: string[];
        publisher?: string;
        pageCount?: number;
        publishedDate?: string;
        industryIdentifiers?: { identifier?: string }[];
        description?: string;
    };
}

// ─── Google Books (API pública, sem chave) ─────────────────────────────────

async function fetchGoogleBooks(url: string): Promise<ImportedWorkData | null> {
    let volumeId: string | null = null;
    const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch) volumeId = idParamMatch[1];
    if (!volumeId) return null;

    try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${volumeId}`);
        if (!res.ok) return null;
        const json: GoogleBooksResponse = await res.json();
        const info = json?.volumeInfo;
        if (!info) return null;
        return {
            title: info.title,
            cover: info.imageLinks?.thumbnail?.replace("http://", "https://"),
            genres: info.categories ?? [],
            author: Array.isArray(info.authors) ? info.authors.join(", ") : undefined,
            publisher: info.publisher,
            totalPages: typeof info.pageCount === "number" ? info.pageCount : undefined,
            releaseYear: info.publishedDate
                ? Number(String(info.publishedDate).slice(0, 4)) || undefined
                : undefined,
            isbn: info.industryIdentifiers?.[0]?.identifier,
            synopsis: typeof info.description === "string" ? info.description.trim() : undefined,
        };
    } catch {
        return null;
    }
}


// ─── Spotify (oEmbed público, sem chave) ───────────────────────────────────
interface SpotifyOEmbedResponse {
    title?: string;
    thumbnail_url?: string;
}

async function fetchSpotify(url: string): Promise<ImportedWorkData | null> {
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

// ─── AO3 (Archive of Our Own) — scraping da página pública ────────────────

// ─── AO3 (Archive of Our Own) — scraping da página pública ────────────────
// A AO3 não tem API pública, então extraímos os dados direto do HTML. Sites
// assim podem mudar o layout a qualquer momento — por isso cada campo abaixo
// tenta MÚLTIPLOS padrões possíveis, e nenhum campo derruba os outros: se só
// o título mudar de classe, por exemplo, ainda conseguimos fandom, tags,
// palavras e capítulos normalmente.

function firstMatch(html: string, patterns: RegExp[]): RegExpMatchArray | undefined {
    for (const re of patterns) {
        const m = html.match(re);
        if (m) return m;
    }
    return undefined;
}

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

async function fetchAO3(url: string): Promise<ImportedWorkData | null> {
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
// ─── Wattpad (API pública v3, sem chave) ───────────────────────────────────

interface WattpadPartResponse {
    group?: { id?: number | string };
}

interface WattpadStoryResponse {
    title?: string;
    description?: string;
    cover?: string;
    user?: { name?: string };
    numParts?: number;
    tags?: string[];
    language?: { name?: string };
}

async function fetchWattpad(url: string): Promise<ImportedWorkData | null> {
    let storyId: string | null = null;

    const storyMatch = url.match(/wattpad\.com\/story\/(\d+)/i);
    if (storyMatch) {
        storyId = storyMatch[1];
    } else {
        // Link de um capítulo específico: precisa resolver o ID da história (group)
        const partMatch = url.match(/wattpad\.com\/(\d+)-/i);
        if (partMatch) {
            try {
                const partRes = await fetch(
                    `https://www.wattpad.com/api/v3/story_parts/${partMatch[1]}?fields=group(id)`,
                );
                if (partRes.ok) {
                    const partJson: WattpadPartResponse = await partRes.json();
                    storyId = partJson?.group?.id ? String(partJson.group.id) : null;
                }
            } catch {
                // ignora e cai no retorno null abaixo
            }
        }
    }

    if (!storyId) return null;

    try {
        const res = await fetch(
            `https://www.wattpad.com/api/v3/stories/${storyId}?fields=title,description,cover,user(name),numParts,tags,language(name),completed,mature`,
        );
        if (!res.ok) return null;
        const json: WattpadStoryResponse = await res.json();
        if (!json?.title) return null;

        const langName: string | undefined = json.language?.name;
        const tags: string[] | undefined = Array.isArray(json.tags) ? json.tags : undefined;

        return {
            title: json.title,
            cover: json.cover,
            author: json.user?.name,
            totalChapters: typeof json.numParts === "number" ? json.numParts : undefined,
            genres: tags,
            fandoms: guessFandomsFromTags(tags),
            tags,
            synopsis: typeof json.description === "string" ? json.description.trim() : undefined,
            language: langName ? [langName] : undefined,
            platform: "Wattpad",
        };
    } catch {
        return null;
    }
}

// ─── Spirit Fanfics (scraping best-effort, sem API pública) ───────────────

async function fetchSpiritFanfics(url: string): Promise<ImportedWorkData | null> {
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
// ─── Fanfiction.net (scraping do HTML clássico da FFN) ─────────────────────

async function fetchFanfictionNet(url: string): Promise<ImportedWorkData | null> {
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

async function fetchSteam(url: string): Promise<ImportedWorkData | null> {
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

async function fetchMyDramaList(url: string): Promise<ImportedWorkData | null> {
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

// ─── Handler principal ──────────────────────────────────────────────────────
export const importWorkFromUrl = createServerFn({ method: "POST" })
    .inputValidator(inputSchema)
    .handler(async ({ data }): Promise<ImportResult> => {
        const ip = getClientIp();
        const rate = checkRateLimit("import-work", ip, IMPORT_LIMIT, IMPORT_WINDOW_MS);
        if (!rate.allowed) {
            return {
                ok: false,
                error: `Muitas importações em pouco tempo. Tente novamente em ${rate.retryAfterSeconds}s.`,
            };
        }

        const { url } = data;
        let result: ImportedWorkData | null = null;
        let source = "";
        let specificParserFailed = false;

        try {
            if (/archiveofourown\.org\/works\/\d+/i.test(url)) {
                result = await fetchAO3(url);
                source = "AO3";
            } else if (/wattpad\.com\//i.test(url)) {
                result = await fetchWattpad(url);
                source = "Wattpad";
            } else if (/spiritfanfics\.com/i.test(url)) {
                result = await fetchSpiritFanfics(url);
                source = "Spirit Fanfics";
            } else if (/fanfiction\.net\/s\/\d+/i.test(url)) {
                result = await fetchFanfictionNet(url);
                source = "Fanfiction.net";
            } else if (/myanimelist\.net\/(anime|manga)\//i.test(url)) {
                result = await fetchJikan(url);
                source = "MyAnimeList";
            } else if (/anilist\.co\/(anime|manga)\//i.test(url)) {
                result = await fetchAniList(url);
                source = "AniList";
            } else if (/books\.google\./i.test(url)) {
                result = await fetchGoogleBooks(url);
                source = "Google Books";
            } else if (/open\.spotify\.com/i.test(url)) {
                result = await fetchSpotify(url);
                source = "Spotify";
            } else if (/store\.steampowered\.com\/app\/\d+/i.test(url)) {
                result = await fetchSteam(url);
                source = "Steam";
            } else if (/mydramalist\.com/i.test(url)) {
                result = await fetchMyDramaList(url);
                source = "MyDramaList";
            }

            // O domínio foi reconhecido, mas o leitor específico dele não achou
            // nada — provavelmente o site mudou o HTML. Registra no log do
            // servidor pra dar pra monitorar isso ao longo do tempo, e segue pro
            // fallback genérico (Open Graph/JSON-LD) logo abaixo.
            if (source && !result) {
                specificParserFailed = true;
                console.warn(`[importWork] Leitor específico de "${source}" não extraiu dados de: ${url}`);
            }

            if (!result) {
                result = await genericOgImport(url);
                if (!source) {
                    try {
                        source = new URL(url).hostname.replace(/^www\./, "");
                    } catch {
                        source = "link";
                    }
                }
            }
        } catch {
            return { ok: false, error: "Não foi possível importar esse link." };
        }

        if (!result || (!result.title && !result.cover)) {
            return {
                ok: false,
                error:
                    "Não conseguimos encontrar informações nesse link. Tente outro link ou preencha manualmente.",
            };
        }

        return {
            ok: true,
            source,
            data: result,
            warning: specificParserFailed
                ? `O leitor automático de ${source} pode estar desatualizado (o site deve ter mudado o layout). Importamos o que deu pra pegar — vale conferir os campos antes de salvar.`
                : undefined,
        };
    });
