// Aplaudir / Vaiar em obras da tela de Recomendações (catálogo e comunidade).
// Mesmo padrão do "award_nominations", mas aqui qualquer RecommendationItem
// pode receber reação — não só indicações de prêmio.
import { collection, doc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { reactToRecItemServer } from "@/lib/api/reactions.functions";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { checkClientCooldown } from "./clientCooldown";

const REACTIONS_COLLECTION = "rec_reactions";
const COUNTS_COLLECTION = "rec_reaction_counts";

// Limite de quantas obras DIFERENTES um usuário pode aplaudir (👏) ou vaiar
// (👎) dentro da mesma categoria (mesmo "type"). Aplausos e vaias contam
// como limites independentes — 5 aplausos + 5 vaias é permitido.
const MAX_REACTIONS_PER_CATEGORY = 5;

// Agrupa o "type" da obra (ex: "Anime", "Light Novel") na mesma categoria,
// ignorando acento/maiúscula — mesma lógica usada em awardsStore.ts.
function slugifyReactionType(type: string): string {
  return type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export type RecReaction = "like" | "boo";

export interface RecReactionCounts {
  likes: number;
  boos: number;
}

const EMPTY_COUNTS: RecReactionCounts = { likes: 0, boos: 0 };

function reactionDocId(itemId: string, uid: string) {
  return `${itemId}__${uid}`;
}

// ── Contagem de aplausos/vaias de um item, em tempo real ────────────────────
export function useRecReactionCounts(itemId: string): RecReactionCounts {
  const [counts, setCounts] = useState<RecReactionCounts>(EMPTY_COUNTS);

  useEffect(() => {
    setCounts(EMPTY_COUNTS);
    if (!itemId) return;
    const ref = doc(db, COUNTS_COLLECTION, itemId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? (snap.data() as Partial<RecReactionCounts>) : {};
        setCounts({ likes: data.likes ?? 0, boos: data.boos ?? 0 });
      },
      (err) => console.error("Erro ao sincronizar reações do item:", err),
    );
    return () => unsub();
  }, [itemId]);

  return counts;
}

// ── Reação do usuário atual a um item, em tempo real ────────────────────────
export function useMyRecReaction(itemId: string): RecReaction | null {
  const [reaction, setReaction] = useState<RecReaction | null>(null);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null)), []);

  useEffect(() => {
    setReaction(null);
    if (!itemId || !uid) return;
    const ref = doc(db, REACTIONS_COLLECTION, reactionDocId(itemId, uid));
    const unsub = onSnapshot(
      ref,
      (snap) => setReaction(snap.exists() ? (snap.data().reaction as RecReaction) : null),
      (err) => console.error("Erro ao sincronizar sua reação:", err),
    );
    return () => unsub();
  }, [itemId, uid]);

  return reaction;
}
// ── Snapshot das contagens até um prazo (deadline) — usado pelo motor de fases do Awards ──
// Em vez de usar os totais "ao vivo" de rec_reaction_counts (que continuam
// mudando depois do prazo, até alguém abrir o app e disparar a virada), esta
// função conta só as reações que já existiam ATÉ o prazo, olhando o createdAt
// de cada reação individual. Assim, mesmo que a virada de fase demore a
// rodar, o resultado congelado é sempre o mesmo: o que valia na hora do
// prazo, e nada que chegou depois.
export async function getRecReactionCountsAsOf(
  deadline: number,
  since?: number,
): Promise<Map<string, RecReactionCounts>> {
  const constraints = [where("createdAt", "<=", deadline)];
  if (since) constraints.push(where("createdAt", ">=", since));
  const snap = await getDocs(query(collection(db, REACTIONS_COLLECTION), ...constraints));
  const result = new Map<string, RecReactionCounts>();
  snap.docs.forEach((d) => {
    const data = d.data() as { itemId?: string; reaction?: RecReaction };
    if (!data.itemId || !data.reaction) return;
    const current = result.get(data.itemId) ?? { likes: 0, boos: 0 };
    if (data.reaction === "like") current.likes += 1;
    else if (data.reaction === "boo") current.boos += 1;
    result.set(data.itemId, current);
  });
  return result;
}

// ── Aplaudir ou vaiar um item ────────────────────────────────────────────────
// A validação real (login, limite de 5 por categoria, contagem atômica)
// agora roda no servidor — veja src/lib/api/reactions.functions.ts.
export async function reactToRecItem(itemId: string, reaction: RecReaction, itemType: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Você precisa estar logado para reagir.");
  checkClientCooldown(`rec-reaction:${user.uid}`, 800); // só UX — quem protege de verdade é o rate limit no servidor

  const idToken = await user.getIdToken();
  const result = await reactToRecItemServer({ data: { idToken, itemId, reaction, itemType } });
  if (!result.ok) throw new Error(result.error ?? "Não foi possível registrar sua reação.");
}

/*
 * ── Regras OBRIGATÓRIAS no Firebase Console → Firestore → Regras
 * (e também replique em firestore.rules na raiz do projeto):
 *
 * match /rec_reaction_counts/{itemId} {
 *   allow read: if request.auth != null;
 *   allow write: if request.auth != null;
 * }
 * match /rec_reactions/{id} {
 *   allow read: if request.auth != null;
 *   allow create, update: if request.auth != null && request.auth.uid == request.resource.data.uid;
 *   allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
 * }
 */