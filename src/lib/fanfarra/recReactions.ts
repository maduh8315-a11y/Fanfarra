// Aplaudir / Vaiar em obras da tela de Recomendações (catálogo e comunidade).
// Mesmo padrão do "award_nominations", mas aqui qualquer RecommendationItem
// pode receber reação — não só indicações de prêmio.
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

const REACTIONS_COLLECTION = "rec_reactions";
const COUNTS_COLLECTION = "rec_reaction_counts";

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

// ── Aplaudir ou vaiar um item ────────────────────────────────────────────────
// Clicar de novo na mesma reação remove o voto; clicar na outra troca.
export async function reactToRecItem(itemId: string, reaction: RecReaction): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado para reagir.");

  const countsRef = doc(db, COUNTS_COLLECTION, itemId);
  const reactionRef = doc(db, REACTIONS_COLLECTION, reactionDocId(itemId, uid));

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
      tx.set(reactionRef, { itemId, uid, reaction, createdAt: Date.now() });
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
 *   allow create, update, delete: if request.auth != null && request.auth.uid == request.resource.data.uid;
 * }
 */