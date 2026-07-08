// Chave sem uid — tags são compartilhadas entre todos os usuários
const TAG_KEY = "fanfarra:tags:global";

function readTags(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TAG_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeTags(tags: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TAG_KEY, JSON.stringify(tags));
}

/** Retorna todas as tags salvas (ordenadas A–Z) */
export function getAllTags(): string[] {
  return readTags().sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Adiciona uma tag se ainda não existir (case-insensitive). Retorna a lista atualizada. */
export function saveTag(tag: string): string[] {
  const trimmed = tag.trim();
  if (!trimmed) return getAllTags();
  const existing = readTags();
  const alreadyExists = existing.some((t) => t.toLowerCase() === trimmed.toLowerCase());
  if (!alreadyExists) {
    writeTags([...existing, trimmed]);
  }
  return getAllTags();
}

/** Remove uma tag da lista global */
export function removeTag(tag: string): string[] {
  writeTags(readTags().filter((t) => t.toLowerCase() !== tag.toLowerCase()));
  return getAllTags();
}
