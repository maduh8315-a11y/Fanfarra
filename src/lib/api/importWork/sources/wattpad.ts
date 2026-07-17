import type { ImportedWorkData } from "../types";
import { guessFandomsFromTags } from "../utils/fandoms";

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

export async function fetchWattpad(url: string): Promise<ImportedWorkData | null> {
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