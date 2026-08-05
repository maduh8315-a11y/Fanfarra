import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit.server";
import type { ImportedWorkData, ImportResult } from "./importWork/types";
import { genericOgImport } from "./importWork/generic";
import { fetchAO3 } from "./importWork/sources/ao3";
import { fetchWattpad } from "./importWork/sources/wattpad";
import { fetchSpiritFanfics } from "./importWork/sources/spiritFanfics";
import { fetchFanfictionNet } from "./importWork/sources/fanfictionNet";
import { fetchJikan } from "./importWork/sources/myAnimeList";
import { fetchAniList } from "./importWork/sources/aniList";
import { fetchGoogleBooks } from "./importWork/sources/googleBooks";
import { fetchSpotify } from "./importWork/sources/spotify";
import { fetchSteam } from "./importWork/sources/steam";
import { fetchMyDramaList } from "./importWork/sources/myDramaList";
import { recordImportResult } from "./importWork/monitor.server";

export type { ImportedWorkData, ImportResult };

const IMPORT_LIMIT = 20;
const IMPORT_WINDOW_MS = 10 * 60 * 1000;

const inputSchema = z.object({
    url: z.string().url(),
    type: z.string(),
});

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
            if (/mangaplus\.shueisha\.co\.jp/i.test(url)) {
                return {
                    ok: false,
                    error:
                        "O MANGA Plus carrega os dados só via JavaScript, então não dá pra importar automaticamente desse link. Procure a mesma obra no MyAnimeList ou AniList e cole o link de lá — ou preencha manualmente.",
                };
            }
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

            const dedicatedSource = source;

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

            if (dedicatedSource) {
                recordImportResult(dedicatedSource, !specificParserFailed, url).catch(() => {});
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