import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit.server";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";

// Máx. 15 uploads a cada 10 minutos, por IP.
const LIMIT = 15;
const WINDOW_MS = 10 * 60 * 1000;

const inputSchema = z.object({
  // Imagem em base64 (sem o prefixo "data:image/...;base64,")
  base64: z.string().min(1),
  mimeType: z.string().min(1),
});

export interface UploadImageResult {
  ok: boolean;
  error?: string;
  url?: string;
}

interface ImgBBResponse {
  data?: { url?: string };
}

export const uploadCoverImageServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<UploadImageResult> => {
    const ip = getClientIp();
    const rate = checkRateLimit("upload-image", ip, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
      return {
        ok: false,
        error: `Muitos envios de imagem em pouco tempo. Tente novamente em ${rate.retryAfterSeconds}s.`,
      };
    }

    if (!data.mimeType.startsWith("image/")) {
      return { ok: false, error: "O arquivo selecionado não é uma imagem." };
    }

    // Tamanho aproximado do arquivo original a partir do base64.
    const approxBytes = Math.ceil((data.base64.length * 3) / 4);
    if (approxBytes > MAX_SIZE_BYTES) {
      return { ok: false, error: "A imagem é muito grande (máximo 5MB)." };
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Upload de imagem não configurado (IMGBB_API_KEY ausente)." };
    }

    try {
      const formData = new FormData();
      formData.append("image", data.base64);

      const res = await fetch(`${IMGBB_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        return { ok: false, error: "Falha ao enviar a imagem. Tente novamente." };
      }

      const json: ImgBBResponse = await res.json();
      const url: string | undefined = json?.data?.url;
      if (!url) {
        return { ok: false, error: "O serviço de imagens não retornou uma URL válida." };
      }

      return { ok: true, url };
    } catch {
      return { ok: false, error: "Falha ao enviar a imagem. Tente novamente." };
    }
  });
