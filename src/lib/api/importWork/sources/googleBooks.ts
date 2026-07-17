import type { ImportedWorkData } from "../types";

// ─── Google Books (API pública, sem chave) ─────────────────────────────────

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

export async function fetchGoogleBooks(url: string): Promise<ImportedWorkData | null> {
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