// Recomendações públicas da comunidade.
//
// Diferente de "works" (privado, filtrado por uid), esta coleção é lida por
// TODOS os usuários autenticados — é o que alimenta a seção "Da comunidade"
// em /recommendations. Cada usuário só pode CRIAR/ATUALIZAR/APAGAR o próprio
// documento (ver regras de segurança sugeridas no fim deste arquivo).
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { useEffect, useState, useSyncExternalStore } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { stripUndefined } from "./firestoreUtils.ts";
import { auth, db } from "./firebase";
import type { Work } from "./types";
import { toast } from "sonner";

const COLLECTION = "communityRecs";
const PAGE_SIZE = 30;

export interface PostedRecommendation {
  id: string; // igual ao id da obra original (work.id)
  uid: string; // dono da recomendação
  username: string; // @username de quem publicou
  title: string;
  type: Work["type"];
  author?: string;
  genres: string[];
  cover?: string;
  rating: number;
  notes?: string; // comentário do usuário sobre a obra (opcional)
  link?: string;
  details?: Record<string, unknown>; // estúdio, plataforma, tags, reações, totais etc.
  createdAt: number;
  updatedAt: number;
}

let cache: PostedRecommendation[] = [];
let unsubscribeSnapshot: (() => void) | null = null;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: PostedRecommendation[] = [];
let hasUser = false;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
let loading = true;
let loadingMore = false;
let hasMore = true;
let pageLimit = PAGE_SIZE;

function notify() {
  listeners.forEach((l) => l());
}

function connect() {
  if (unsubscribeSnapshot || !hasUser) return;
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"), limit(pageLimit));
  unsubscribeSnapshot = onSnapshot(
    q,
    (snap) => {
      cache = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PostedRecommendation, "id">),
      }));
      hasMore = snap.docs.length >= pageLimit;
      loading = false;
      loadingMore = false;
      notify();
    },
    (err) => {
      console.error("Erro ao sincronizar recomendações da comunidade:", err);
      loading = false;
      loadingMore = false;
      notify();
    },
  );
}

// Carrega mais recomendações da comunidade. Reassina a mesma escuta com um
// limite maior — o que já está na tela continua atualizando ao vivo.
export function loadMoreCommunity(): void {
  if (loading || loadingMore || !hasMore) return;
  loadingMore = true;
  pageLimit += PAGE_SIZE;
  notify();
  unsubscribeSnapshot?.();
  unsubscribeSnapshot = null;
  connect();
}
// Assina a coleção pública inteira (sem filtro de uid) sempre que houver um
// usuário logado E alguma tela estiver de fato usando esse dado — é isso que
// faz a recomendação aparecer para todo mundo, sem manter a conexão aberta
// à toa em telas que não mostram nada da comunidade.
onAuthStateChanged(auth, (user) => {
  unsubscribeSnapshot?.();
  unsubscribeSnapshot = null;
  cache = [];
  hasUser = !!user;
  pageLimit = PAGE_SIZE;
  hasMore = true;
  loading = hasUser; // sem usuário, não tem nada pra carregar
  notify();
  if (hasUser && listeners.size > 0) connect();
});

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
  if (listeners.size === 1) connect();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      disconnectTimer = setTimeout(() => {
        unsubscribeSnapshot?.();
        unsubscribeSnapshot = null;
      }, 15_000);
    }
  };
}

// Lista, em tempo real, TODAS as recomendações públicas postadas por qualquer usuário.
export function usePublicRecommendations(): PostedRecommendation[] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(
    subscribe,
    () => cache,
    () => SERVER_SNAPSHOT,
  );
  return mounted ? data : SERVER_SNAPSHOT;
}

export function usePublicRecommendationsLoading(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(
    subscribe,
    () => loading,
    () => true,
  );
  return mounted ? data : true;
}

export function useCommunityHasMore(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hasMore,
    () => true,
  );
}

export function useCommunityLoadingMore(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => loadingMore,
    () => false,
  );
}

// Publica (ou atualiza, se já publicada) uma obra como recomendação pública.
export function postWorkAsRecommendation(work: Work, username: string): void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado.");
  const now = Date.now();
  const ref = doc(db, COLLECTION, work.id);
  setDoc(
    ref,
    stripUndefined({
      uid,
      username,
      title: work.title,
      type: work.type,
      author: (work.details?.author as string | undefined) || undefined,
      genres: work.genres ?? [],
      cover: work.cover || undefined,
      rating: work.rating,
      notes: work.notes || undefined,
      link: work.link || undefined,
      details: work.details || undefined,
      createdAt: now,
      updatedAt: now,
    }),
  ).catch((err) => {
    console.error("Erro ao publicar recomendação:", err);
    toast.error("Não foi possível publicar na comunidade. Tente de novo.");
  });
}

// Remove a publicação pública. A obra continua normalmente na biblioteca do usuário.
export function removeRecommendationPost(workId: string): void {
  deleteDoc(doc(db, COLLECTION, workId)).catch((err) => {
    console.error("Erro ao remover recomendação:", err);
    toast.error("Não foi possível remover a publicação. Tente de novo.");
  });
}

// Apaga todas as recomendações públicas do usuário. Usada ao excluir a conta.
export async function deleteAllRecommendationsForUser(uid: string): Promise<void> {
  const q = query(collection(db, COLLECTION), where("uid", "==", uid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/*
 * ── Regra de segurança sugerida (configurar no Console do Firebase, em
 *    Firestore Database → Regras — este projeto não versiona o arquivo
 *    firestore.rules, então cole isto lá):
 *
 * match /communityRecs/{recId} {
 *   allow read: if request.auth != null;
 *   allow create, update: if request.auth != null && request.auth.uid == request.resource.data.uid;
 *   allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
 * }
 */
