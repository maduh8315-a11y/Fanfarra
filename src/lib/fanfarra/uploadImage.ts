import { uploadCoverImageServer } from "@/lib/api/uploadImage.functions";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Converte um File em base64 puro (sem o prefixo "data:...;base64,").
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

/**
 * Sobe uma imagem de capa para o ImgBB (hospedagem externa gratuita) e
 * devolve a URL pública, que é o que deve ser salvo no campo `cover` do
 * Firestore (nunca a imagem em si, para não estourar o limite de 1MB por
 * documento).
 *
 * O upload em si acontece no servidor (uploadCoverImageServer) — a chave do
 * ImgBB nunca fica exposta no navegador, e o servidor aplica rate limit por
 * IP pra evitar abuso.
 *
 * @param file   Arquivo escolhido pelo usuário (input type="file")
 * @param folder Mantido por compatibilidade de assinatura com o restante do
 *               app; o ImgBB não usa pastas, mas o parâmetro fica documentado
 *               caso troquemos de provedor no futuro.
 *
 */

/**
 * Redimensiona e comprime a imagem no navegador antes de subir, evitando
 * enviar fotos de 4000px/5MB só pra exibir num card pequeno.
 */
function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas não suportado."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Falha ao comprimir imagem."));
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = url;
  });
}

export async function uploadCoverImage(
  file: File,
  _folder: "bookcases" | "shelves" | "works",
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo selecionado não é uma imagem.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("A imagem é muito grande (máximo 5MB).");
  }

  const compressed = await compressImage(file);
  const base64 = await fileToBase64(compressed);

  const result = await uploadCoverImageServer({
    data: { base64, mimeType: file.type },
  });

  if (!result.ok || !result.url) {
    throw new Error(result.error ?? "Falha ao enviar a imagem. Tente novamente.");
  }

  return result.url;
}
