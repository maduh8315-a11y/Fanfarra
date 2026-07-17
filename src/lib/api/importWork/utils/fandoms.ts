import { POPULAR_FANDOMS } from "@/lib/fanfarra/formConfig";

// Sites como Wattpad misturam tudo em uma única lista de "tags" (gênero,
// fandom, tropes, etc). Em vez de jogar tudo no campo de Fandom, só
// aproveitamos as que reconhecemos de uma lista de fandoms populares —
// o resto continua disponível no campo de Tags, sem duplicar/confundir.
export function guessFandomsFromTags(tags: string[] | undefined): string[] | undefined {
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