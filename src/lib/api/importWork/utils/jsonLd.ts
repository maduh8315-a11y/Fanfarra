import { decodeHtmlEntities } from "./html";
import type { ImportedWorkData } from "../types";

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

export function extractJsonLd(html: string): Partial<ImportedWorkData> | null {
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