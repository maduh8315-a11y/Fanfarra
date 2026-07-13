// Aplaudir / Vaiar em obras da tela de Recomendações (catálogo e comunidade).
// Mesmo padrão do "award_nominations", mas aqui qualquer RecommendationItem
// pode receber reação — não só indicações de prêmio.
import { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, where } from "firebase/firestore";
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
// Clicar de novo na mesma reação remove o voto; clicar na outra troca.
export async function reactToRecItem(itemId: string, reaction: RecReaction, itemType: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado para reagir.");
  checkClientCooldown(`rec-reaction:${uid}`, 800);

  const typeSlug = slugifyReactionType(itemType);
  const countsRef = doc(db, COUNTS_COLLECTION, itemId);
  const reactionRef = doc(db, REACTIONS_COLLECTION, reactionDocId(itemId, uid));

  const currentSnap = await getDoc(reactionRef);
  const currentReaction = currentSnap.exists() ? (currentSnap.data().reaction as RecReaction) : null;

  // Só precisa checar o limite quando o usuário está adicionando um voto
  // NOVO nessa direção (curtir/vaiar uma obra que ainda não tinha esse
  // voto). Remover ou trocar o próprio voto num item já contado não conta
  // como uma obra a mais.
  if (currentReaction !== reaction) {
    const limitQuery = query(
      collection(db, REACTIONS_COLLECTION),
      where("uid", "==", uid),
      where("reaction", "==", reaction),
      where("type", "==", typeSlug),
    );
    const existing = await getDocs(limitQuery);
    const alreadyCountsThisItem = existing.docs.some((d) => d.id === reactionDocId(itemId, uid));
    const distinctCount = existing.size - (alreadyCountsThisItem ? 1 : 0);
    if (distinctCount >= MAX_REACTIONS_PER_CATEGORY) {
      const label = reaction === "like" ? "aplaudir" : "vaiar";
      throw new Error(`Você já pode ${label} no máximo ${MAX_REACTIONS_PER_CATEGORY} obras nesta categoria.`);
    }
  }

  await runTransaction(db, async (tx) => {
    const [countsSnap, reactionSnap] = await Promise.all([tx.get(countsRef), tx.get(reactionRef)]);

    let likes = countsSnap.exists() ? ((countsSnap.data().likes as number) ?? 0) : 0;
    let boos = countsSnap.exists() ? ((countsSnap.data().boos as number) ?? 0) : 0;
    const previous = reactionSnap.exists() ? (reactionSnap.data().reaction as RecReaction) : null;

    if (previous === reaction) {
      if (reaction === "like") likes = Math.max(0, likes - 1);
      else boos = Math.max(0, boos - 1);
      tx.delete(reactionRef);
    } else {
      if (previous === "like") likes = Math.max(0, likes - 1);
      if (previous === "boo") boos = Math.max(0, boos - 1);
      if (reaction === "like") likes += 1;
      else boos += 1;
      tx.set(reactionRef, { itemId, uid, reaction, type: typeSlug, createdAt: Date.now() });
    }

    tx.set(countsRef, { likes, boos }, { merge: true });
  });
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