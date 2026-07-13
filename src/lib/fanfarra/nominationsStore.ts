// Fase 0 do funil do Fanfarra Awards: recomendações abertas por tema.
// Qualquer usuário sugere uma obra para um tema (ex: "anime") e os outros
// reagem com Aplaudir / Vaiar. As 10 mais aplaudidas do tema alimentam a
// categoria "Melhor X"; as 10 mais vaiadas alimentam a categoria "Pior X".
import {
  collection,
  doc,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  runTransaction,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useEffect, useState, useSyncExternalStore } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { stripUndefined } from "./firestoreUtils";

const NOMINATIONS_COLLECTION = "award_nominations";
const REACTIONS_COLLECTION = "award_reactions";

export interface AwardNomination {
  id: string;
  themeId: string;
  workTitle: string;
  cover?: string;
  uid: string;
  username: string;
  applause: number;
  boos: number;
  createdAt: number;
}

export type Reaction = "aplauso" | "vaia";

// ── Indicações de um tema, em tempo real ────────────────────────────────────
const nomCaches = new Map<string, AwardNomination[]>();
const nomListeners = new Map<string, Set<() => void>>();
const nomUnsubs = new Map<string, () => void>();
const nomDisconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const EMPTY_NOMS: AwardNomination[] = [];

function notifyNoms(themeId: string) {
  nomListeners.get(themeId)?.forEach((l) => l());
}

function connectNoms(themeId: string) {
  if (nomUnsubs.has(themeId)) return;
  const q = query(collection(db, NOMINATIONS_COLLECTION), where("themeId", "==", themeId));
  const unsub = onSnapshot(
    q,
    (snap) => {
      nomCaches.set(
        themeId,
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AwardNomination, "id">) })),
      );
      notifyNoms(themeId);
    },
    (err) => console.error(`Erro ao sincronizar indicações do tema ${themeId}:`, err),
  );
  nomUnsubs.set(themeId, unsub);
}

function subscribeNoms(themeId: string) {
  return (cb: () => void) => {
    if (!nomListeners.has(themeId)) nomListeners.set(themeId, new Set());
    const set = nomListeners.get(themeId)!;
    set.add(cb);
    const timer = nomDisconnectTimers.get(themeId);
    if (timer) {
      clearTimeout(timer);
      nomDisconnectTimers.delete(themeId);
    }
    if (set.size === 1) connectNoms(themeId);
    return () => {
      set.delete(cb);
      if (set.size === 0) {
        nomDisconnectTimers.set(
          themeId,
          setTimeout(() => {
            nomUnsubs.get(themeId)?.();
            nomUnsubs.delete(themeId);
          }, 15_000),
        );
      }
    };
  };
}

export function useNominations(themeId: string): AwardNomination[] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(
    subscribeNoms(themeId),
    () => nomCaches.get(themeId) ?? EMPTY_NOMS,
    () => EMPTY_NOMS,
  );
  return mounted ? data : EMPTY_NOMS;
}

// Ordena por aplausos ("melhor") ou vaias ("pior"), decrescente.
export function rankNominations(noms: AwardNomination[], kind: "melhor" | "pior"): AwardNomination[] {
  return [...noms].sort((a, b) => (kind === "melhor" ? b.applause - a.applause : b.boos - a.boos));
}

// ── Enviar uma nova sugestão ────────────────────────────────────────────────
export async function submitNomination(themeId: string, workTitle: string, cover?: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  const username = auth.currentUser?.displayName;
  if (!uid || !username) throw new Error("Usuário não autenticado.");

  const title = workTitle.trim();
  if (!title) throw new Error("Digite o nome da obra.");

  const existing = nomCaches.get(themeId) ?? [];
  if (existing.some((n) => n.workTitle.toLowerCase() === title.toLowerCase())) {
    throw new Error("Essa obra já foi recomendada — aplauda ela em vez de duplicar!");
  }

  await addDoc(
    collection(db, NOMINATIONS_COLLECTION),
    stripUndefined({
      themeId,
      workTitle: title,
      cover: cover || undefined,
      uid,
      username,
      applause: 0,
      boos: 0,
      createdAt: Date.now(),
    }),
  );
}

// ── Reagir (aplaudir/vaiar) a uma indicação ─────────────────────────────────
// Um usuário só pode ter UMA reação ativa por indicação (doc id determinístico
// `${nominationId}__${uid}`). Clicar de novo na mesma reação remove o voto;
// clicar na outra troca. Tudo numa transação pra manter os contadores certos.
export async function reactToNomination(nominationId: string, themeId: string, reaction: Reaction): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado.");

  const nominationRef = doc(db, NOMINATIONS_COLLECTION, nominationId);
  const reactionRef = doc(db, REACTIONS_COLLECTION, `${nominationId}__${uid}`);

  await runTransaction(db, async (tx) => {
    const [nomSnap, reactionSnap] = await Promise.all([tx.get(nominationRef), tx.get(reactionRef)]);
    if (!nomSnap.exists()) throw new Error("Indicação não encontrada.");

    const current = nomSnap.data() as Omit<AwardNomination, "id">;
    let applause = current.applause ?? 0;
    let boos = current.boos ?? 0;
    const previous = reactionSnap.exists() ? (reactionSnap.data().reaction as Reaction) : null;

    if (previous === reaction) {
      if (reaction === "aplauso") applause = Math.max(0, applause - 1);
      else boos = Math.max(0, boos - 1);
      tx.delete(reactionRef);
    } else {
      if (previous === "aplauso") applause = Math.max(0, applause - 1);
      if (previous === "vaia") boos = Math.max(0, boos - 1);
      if (reaction === "aplauso") applause += 1;
      else boos += 1;
      tx.set(reactionRef, { nominationId, themeId, uid, reaction, createdAt: Date.now() });
    }

    tx.update(nominationRef, { applause, boos });
  });
}

// Reações do usuário atual, por indicação — destaca o botão ativo.
let myReactionsCache: Record<string, Reaction> = {};
let myReactionsUnsub: (() => void) | null = null;
const myReactionsListeners = new Set<() => void>();
let myReactionsUid: string | null = null;
const EMPTY_REACTIONS: Record<string, Reaction> = {};

function notifyMyReactions() {
  myReactionsListeners.forEach((l) => l());
}

function connectMyReactions() {
  if (myReactionsUnsub || !myReactionsUid) return;
  const q = query(collection(db, REACTIONS_COLLECTION), where("uid", "==", myReactionsUid));
  myReactionsUnsub = onSnapshot(
    q,
    (snap) => {
      const next: Record<string, Reaction> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as { nominationId: string; reaction: Reaction };
        next[data.nominationId] = data.reaction;
      });
      myReactionsCache = next;
      notifyMyReactions();
    },
    (err) => console.error("Erro ao sincronizar suas reações:", err),
  );
}

onAuthStateChanged(auth, (user) => {
  myReactionsUnsub?.();
  myReactionsUnsub = null;
  myReactionsUid = user?.uid ?? null;
  myReactionsCache = {};
  notifyMyReactions();
  if (myReactionsUid && myReactionsListeners.size > 0) connectMyReactions();
});

function subscribeMyReactions(cb: () => void) {
  myReactionsListeners.add(cb);
  if (myReactionsListeners.size === 1) connectMyReactions();
  return () => {
    myReactionsListeners.delete(cb);
    if (myReactionsListeners.size === 0) {
      myReactionsUnsub?.();
      myReactionsUnsub = null;
    }
  };
}

export function useMyNominationReactions(): Record<string, Reaction> {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(subscribeMyReactions, () => myReactionsCache, () => EMPTY_REACTIONS);
  return mounted ? data : EMPTY_REACTIONS;
}

// ── Promoção Fase 0 → Fase 1 (ação administrativa) ──────────────────────────
// Corta o top 10 de aplausos e o top 10 de vaias de um tema e grava em
// `nominees` das categorias correspondentes. Substitui o cadastro manual.
export async function promoteThemeToIndicacao(
  themeId: string,
  melhorCategoryId: string,
  piorCategoryId: string,
): Promise<{ melhor: string[]; pior: string[] }> {
  const snap = await getDocs(query(collection(db, NOMINATIONS_COLLECTION), where("themeId", "==", themeId)));
  const noms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AwardNomination, "id">) }));

  const melhor = rankNominations(noms, "melhor").slice(0, 10).map((n) => n.workTitle);
  const pior = rankNominations(noms, "pior").slice(0, 10).map((n) => n.workTitle);

  await Promise.all([
    updateDoc(doc(db, "awards_catalog", melhorCategoryId), { nominees: melhor }),
    updateDoc(doc(db, "awards_catalog", piorCategoryId), { nominees: pior }),
  ]);

  return { melhor, pior };
}

// ── Leaderboard "melhores recomendadores" ───────────────────────────────────
// Critério: (nº de recomendações) × (taxa de aprovação = aplausos / total de reações).
export interface RecommenderRankRow {
  uid: string;
  username: string;
  nominations: number;
  applause: number;
  boos: number;
  approvalRate: number;
  score: number;
}

export function useRecommenderLeaderboard(): RecommenderRankRow[] {
  const [rows, setRows] = useState<RecommenderRankRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    // Fonte real: obras postadas em /recommendations (communityRecs) +
    // aplausos/vaias reais que elas recebem (rec_reaction_counts), com o
    // mesmo prefixo "community_" usado pelo funil do Awards.
    Promise.all([
      getDocs(collection(db, "communityRecs")),
      getDocs(collection(db, "rec_reaction_counts")),
    ]).then(([recsSnap, countsSnap]) => {
      if (cancelled) return;

      const countsById = new Map<string, { likes: number; boos: number }>();
      countsSnap.docs.forEach((d) => {
        const data = d.data() as { likes?: number; boos?: number };
        countsById.set(d.id, { likes: data.likes ?? 0, boos: data.boos ?? 0 });
      });

      const byUser = new Map<string, RecommenderRankRow>();
      recsSnap.docs.forEach((d) => {
        const rec = d.data() as { uid?: string; username?: string };
        if (!rec.uid || !rec.username) return;
        const counts = countsById.get(`community_${d.id}`) ?? { likes: 0, boos: 0 };
        const row = byUser.get(rec.uid) ?? {
          uid: rec.uid,
          username: rec.username,
          nominations: 0,
          applause: 0,
          boos: 0,
          approvalRate: 0,
          score: 0,
        };
        row.nominations += 1;
        row.applause += counts.likes;
        row.boos += counts.boos;
        byUser.set(rec.uid, row);
      });

      const list = Array.from(byUser.values()).map((row) => {
        const total = row.applause + row.boos;
        const approvalRate = total > 0 ? row.applause / total : 0;
        return { ...row, approvalRate, score: row.nominations * approvalRate };
      });
      list.sort((a, b) => b.score - a.score);
      setRows(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return rows;
}

// ── Limpeza ao excluir conta ─────────────────────────────────────────────────
export async function deleteNominationsAndReactionsForUser(uid: string): Promise<void> {
  const [noms, reactions] = await Promise.all([
    getDocs(query(collection(db, NOMINATIONS_COLLECTION), where("uid", "==", uid))),
    getDocs(query(collection(db, REACTIONS_COLLECTION), where("uid", "==", uid))),
  ]);
  await Promise.all([...noms.docs.map((d) => deleteDoc(d.ref)), ...reactions.docs.map((d) => deleteDoc(d.ref))]);
}

/*
 * ── Regras de segurança OBRIGATÓRIAS (Console do Firebase → Firestore → Regras):
 *
 * match /award_nominations/{id} {
 *   allow read: if request.auth != null;
 *   allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
 *   // Atenção: "update" fica liberado pra qualquer autenticado porque o
 *   // contador de aplausos/vaias é atualizado por QUEM REAGE, não pelo dono
 *   // da sugestão. Sem Cloud Functions não dá pra restringir só ao campo
 *   // applause/boos — é uma limitação conhecida (alguém malicioso poderia
 *   // editar o texto da sugestão de outra pessoa). Se isso virar problema,
 *   // a solução correta é mover esse incremento pra uma Cloud Function.
 *   allow update: if request.auth != null;
 *   allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
 * }
* match /award_reactions/{id} {
 *   allow read: if request.auth != null;
 *   allow create, update: if request.auth != null && request.auth.uid == request.resource.data.uid;
 *   allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
 * }
 */