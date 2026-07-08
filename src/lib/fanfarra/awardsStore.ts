import { useEffect, useState, useSyncExternalStore } from "react";
import {
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { stripUndefined } from "./firestoreUtils";
import { pushNotification } from "./extras";

// ===== Configuração da edição (ano/título/fase/prazos) — editável no Console do Firebase =====
const CONFIG_COLLECTION = "awards_config";
const CONFIG_DOC_ID = "current";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Fases do funil: recomendação → indicação → final → resultado
export type AwardsPhase = "recomendacao" | "indicacao" | "final" | "resultado";

export interface AwardsConfig {
  year: number;
  title: string;
  phase: AwardsPhase;
  // Timestamps (Date.now()) — quando cada fase deve virar automaticamente.
  recomendacaoDeadline?: number;
  indicacaoDeadline?: number;
  finalDeadline?: number;
}

const DEFAULT_CONFIG: AwardsConfig = {
  year: 2025,
  title: "Fanfarra Awards 2025",
  phase: "recomendacao",
};

let configCache: AwardsConfig = DEFAULT_CONFIG;
const configListeners = new Set<() => void>();
let configUnsub: (() => void) | null = null;
let configDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

function notifyConfig() {
  configListeners.forEach((l) => l());
}

function connectConfig() {
  if (configUnsub) return;
  configUnsub = onSnapshot(
    doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID),
    (snap) => {
      configCache = snap.exists()
        ? { ...DEFAULT_CONFIG, ...(snap.data() as Partial<AwardsConfig>) }
        : DEFAULT_CONFIG;
      notifyConfig();
    },
    (err) => console.error("Erro ao carregar configuração do Awards:", err),
  );
}

function subscribeConfig(cb: () => void) {
  configListeners.add(cb);
  if (configDisconnectTimer) {
    clearTimeout(configDisconnectTimer);
    configDisconnectTimer = null;
  }
  if (configListeners.size === 1) connectConfig();
  return () => {
    configListeners.delete(cb);
    if (configListeners.size === 0) {
      configDisconnectTimer = setTimeout(() => {
        configUnsub?.();
        configUnsub = null;
      }, 15_000);
    }
  };
}

export function useAwardsConfig(): AwardsConfig {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(subscribeConfig, () => configCache, () => DEFAULT_CONFIG);
  return mounted ? data : DEFAULT_CONFIG;
}

export function useAwardsPhase(): AwardsPhase {
  return useAwardsConfig().phase;
}

// Ação administrativa: avança a fase do funil pra todo mundo (uso manual/emergencial).
export async function setAwardsPhase(phase: AwardsPhase): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), { phase }, { merge: true });
}

// Ação administrativa: (re)inicia uma edição do Awards — abre a fase de
// recomendação e define quando ela fecha (vira "indicacao" automaticamente).
export async function setRecomendacaoDeadline(timestamp: number): Promise<void> {
  await setDoc(
    doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID),
    { phase: "recomendacao", recomendacaoDeadline: timestamp },
    { merge: true },
  );
}

// ===== Catálogo de categorias/indicados — editável no Console do Firebase =====
const CATALOG_COLLECTION = "awards_catalog";

export type AwardCategoryKind = "melhor" | "pior";

export interface AwardCategory {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  nominees: string[];
  order?: number;
  kind: AwardCategoryKind;
  themeId: string; // liga a categoria ao "type" das recomendações (slugificado)
  finalists?: string[]; // preenchido automaticamente na virada Fase 1 → Fase 2
}

let categoriesCache: AwardCategory[] = [];
const categoriesListeners = new Set<() => void>();
let categoriesUnsub: (() => void) | null = null;
let categoriesDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

function notifyCategories() {
  categoriesListeners.forEach((l) => l());
}

function connectCategories() {
  if (categoriesUnsub) return;
  categoriesUnsub = onSnapshot(
    query(collection(db, CATALOG_COLLECTION), orderBy("order", "asc")),
    (snap) => {
      categoriesCache = snap.docs.map((d) => {
        const data = d.data() as Partial<AwardCategory>;
        return {
          id: d.id,
          name: data.name,
          emoji: data.emoji,
          icon: data.icon,
          nominees: data.nominees ?? [],
          order: data.order,
          kind: data.kind ?? "melhor",
          themeId: data.themeId ?? d.id,
          finalists: data.finalists,
        } as AwardCategory;
      });
      notifyCategories();
    },
    (err) => console.error("Erro ao carregar categorias do Awards:", err),
  );
}

function subscribeCategories(cb: () => void) {
  categoriesListeners.add(cb);
  if (categoriesDisconnectTimer) {
    clearTimeout(categoriesDisconnectTimer);
    categoriesDisconnectTimer = null;
  }
  if (categoriesListeners.size === 1) connectCategories();
  return () => {
    categoriesListeners.delete(cb);
    if (categoriesListeners.size === 0) {
      categoriesDisconnectTimer = setTimeout(() => {
        categoriesUnsub?.();
        categoriesUnsub = null;
      }, 15_000);
    }
  };
}

const EMPTY_CATEGORIES: AwardCategory[] = [];

export function useAwardCategories(): AwardCategory[] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(subscribeCategories, () => categoriesCache, () => EMPTY_CATEGORIES);
  return mounted ? data : EMPTY_CATEGORIES;
}

// ===== Votos (fases "indicacao" e "final") =====

export interface AwardVoteDoc {
  votes: Record<string, string>;
  confirmed: boolean;
  year: number;
}

export interface AwardVoteRecord extends AwardVoteDoc {
  uid: string;
}

export interface AwardResultRow {
  nominee: string;
  count: number;
  pct: number;
}

function createPhaseVoteStore(phaseCollection: string) {
  const DEFAULT_DOC: AwardVoteDoc = { votes: {}, confirmed: false, year: DEFAULT_CONFIG.year };

  let cache: AwardVoteDoc = DEFAULT_DOC;
  let unsubscribeSnapshot: (() => void) | null = null;
  const listeners = new Set<() => void>();
  let currentUid: string | null = null;
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function notify() {
    listeners.forEach((l) => l());
  }

  function connectVotes() {
    if (unsubscribeSnapshot || !currentUid) return;
    unsubscribeSnapshot = onSnapshot(
      doc(db, phaseCollection, currentUid),
      (snap) => {
        cache = snap.exists() ? (snap.data() as AwardVoteDoc) : DEFAULT_DOC;
        notify();
      },
      (err) => console.error(`Erro ao sincronizar votos (${phaseCollection}):`, err),
    );
  }

  onAuthStateChanged(auth, (user) => {
    unsubscribeSnapshot?.();
    unsubscribeSnapshot = null;
    currentUid = user?.uid ?? null;
    cache = DEFAULT_DOC;
    notify();
    if (currentUid && listeners.size > 0) connectVotes();
  });

  function subscribe(cb: () => void) {
    listeners.add(cb);
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
    if (listeners.size === 1) connectVotes();
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

  let allVotesCache: AwardVoteRecord[] = [];
  let unsubscribeAllVotes: (() => void) | null = null;
  const allVotesListeners = new Set<() => void>();
  let allVotesCurrentUser = false;
  let allVotesDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function notifyAllVotes() {
    allVotesListeners.forEach((l) => l());
  }

  function connectAllVotes() {
    if (unsubscribeAllVotes || !allVotesCurrentUser) return;
    const q = query(collection(db, phaseCollection), where("confirmed", "==", true));
    unsubscribeAllVotes = onSnapshot(
      q,
      (snap) => {
        allVotesCache = snap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as Omit<AwardVoteRecord, "uid">) }))
          .filter((v) => v.year === configCache.year);
        notifyAllVotes();
      },
      (err) => console.error(`Erro ao sincronizar resultados (${phaseCollection}):`, err),
    );
  }

  onAuthStateChanged(auth, (user) => {
    unsubscribeAllVotes?.();
    unsubscribeAllVotes = null;
    allVotesCurrentUser = !!user;
    allVotesCache = [];
    notifyAllVotes();
    if (allVotesCurrentUser && allVotesListeners.size > 0) connectAllVotes();
  });

  function subscribeAllVotes(cb: () => void) {
    allVotesListeners.add(cb);
    if (allVotesDisconnectTimer) {
      clearTimeout(allVotesDisconnectTimer);
      allVotesDisconnectTimer = null;
    }
    if (allVotesListeners.size === 1) connectAllVotes();
    return () => {
      allVotesListeners.delete(cb);
      if (allVotesListeners.size === 0) {
        allVotesDisconnectTimer = setTimeout(() => {
          unsubscribeAllVotes?.();
          unsubscribeAllVotes = null;
        }, 15_000);
      }
    };
  }

  const EMPTY_VOTES: AwardVoteRecord[] = [];

  function useVotes(): Record<string, string> {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const data = useSyncExternalStore(subscribe, () => cache.votes, () => DEFAULT_DOC.votes);
    return mounted ? data : DEFAULT_DOC.votes;
  }

  const DEFAULT_CONFIRMED = { confirmed: false, year: DEFAULT_CONFIG.year };
  let lastConfirmedSnapshot = DEFAULT_CONFIRMED;

  function getConfirmedSnapshot() {
    if (lastConfirmedSnapshot.confirmed !== cache.confirmed || lastConfirmedSnapshot.year !== cache.year) {
      lastConfirmedSnapshot = { confirmed: cache.confirmed, year: cache.year };
    }
    return lastConfirmedSnapshot;
  }

  function useConfirmed(): { confirmed: boolean; year: number } {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const data = useSyncExternalStore(subscribe, getConfirmedSnapshot, () => DEFAULT_CONFIRMED);
    return mounted ? data : DEFAULT_CONFIRMED;
  }

  function useAllConfirmedVotes(): AwardVoteRecord[] {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const data = useSyncExternalStore(subscribeAllVotes, () => allVotesCache, () => EMPTY_VOTES);
    return mounted ? data : EMPTY_VOTES;
  }

  function vote(categoryId: string, nominee: string): void {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Usuário não autenticado.");
    const next: AwardVoteDoc = {
      ...cache,
      year: configCache.year,
      votes: { ...cache.votes, [categoryId]: nominee },
    };
    cache = next;
    notify();
    setDoc(doc(db, phaseCollection, uid), stripUndefined(next), { merge: true }).catch((err) =>
      console.error(`Erro ao registrar voto (${phaseCollection}):`, err),
    );
  }

  function confirm(notifyText: string): void {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Usuário não autenticado.");
    const next: AwardVoteDoc = { ...cache, confirmed: true, year: configCache.year };
    cache = next;
    notify();
    setDoc(doc(db, phaseCollection, uid), stripUndefined(next), { merge: true }).catch((err) =>
      console.error(`Erro ao confirmar votos (${phaseCollection}):`, err),
    );
    pushNotification({ icon: "vote", text: notifyText });
  }

  async function deleteForUser(uid: string): Promise<void> {
    await deleteDoc(doc(db, phaseCollection, uid));
  }

  return { useVotes, useConfirmed, useAllConfirmedVotes, vote, confirm, deleteForUser };
}

export const indicacaoVotes = createPhaseVoteStore("award_votes_indicacao");
export const finalVotes = createPhaseVoteStore("award_votes_final");

type VotePhase = "indicacao" | "final";
const storeFor = (phase: VotePhase) => (phase === "indicacao" ? indicacaoVotes : finalVotes);

export function useAwardVotes(phase: VotePhase) {
  return storeFor(phase).useVotes();
}
export function useAwardConfirmed(phase: VotePhase) {
  return storeFor(phase).useConfirmed();
}
export function useAllConfirmedAwardVotes(phase: VotePhase) {
  return storeFor(phase).useAllConfirmedVotes();
}
export function voteAward(phase: VotePhase, categoryId: string, nominee: string) {
  storeFor(phase).vote(categoryId, nominee);
}
export function confirmAwardVotes(phase: VotePhase): void {
  const label = phase === "indicacao" ? "indicados" : "finalistas";
  storeFor(phase).confirm(`Seu voto nos ${label} do ${configCache.title} foi registrado! 🏆`);
}

export function getAwardResults(categoryId: string, allVotes: AwardVoteRecord[]): AwardResultRow[] {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const v of allVotes) {
    const nominee = v.votes[categoryId];
    if (!nominee) continue;
    counts[nominee] = (counts[nominee] ?? 0) + 1;
    total += 1;
  }
  return Object.entries(counts)
    .map(([nominee, count]) => ({ nominee, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

// Apaga os votos do usuário nas duas fases. Usada ao excluir a conta.
export async function deleteAwardVotesForUser(uid: string): Promise<void> {
  await Promise.all([indicacaoVotes.deleteForUser(uid), finalVotes.deleteForUser(uid)]);
}

// ===== Motor automático do funil ("cron preguiçoso", sem Cloud Functions) =====
//
// Chamado sempre que alguém abre a tela de Awards. Se o prazo da fase atual já
// passou, ele mesmo calcula a virada e grava no Firestore — o primeiro cliente
// a checar depois do prazo "puxa" a mudança pra todo mundo. Uma transação
// garante que, mesmo com vários usuários checando ao mesmo tempo, a virada só
// acontece uma vez.

// Slugifica o "type" das recomendações (ex: "Light Novel" -> "light-novel")
// pra bater com o campo themeId configurado em awards_catalog no Firestore.
function slugifyType(type: string): string {
  return type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export async function checkAndAdvanceAwardsPhase(
  categories: AwardCategory[],
  opts: { force?: boolean } = {},
): Promise<void> {
  if (categories.length === 0) return;

  const configSnap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID));
  const config = configSnap.exists()
    ? { ...DEFAULT_CONFIG, ...(configSnap.data() as Partial<AwardsConfig>) }
    : DEFAULT_CONFIG;
  const now = Date.now();

  if (config.phase === "recomendacao") {
    const deadline = config.recomendacaoDeadline;
    if (!deadline || (!opts.force && now < deadline)) return;
    await freezeNominationsAndAdvance(categories, config);
  } else if (config.phase === "indicacao") {
    const deadline = config.indicacaoDeadline;
    if (!deadline || (!opts.force && now < deadline)) return;
    await advanceIndicacaoToFinal(categories, config);
  } else if (config.phase === "final") {
    const deadline = config.finalDeadline;
    if (!deadline || (!opts.force && now < deadline)) return;
    await advanceFinalToResultado();
  }
}

// Atalho pro admin: ignora o prazo e força a checagem/virada agora mesmo.
export async function forceAdvanceAwardsPhase(categories: AwardCategory[]): Promise<void> {
  await checkAndAdvanceAwardsPhase(categories, { force: true });
}

// Fase 0 → 1: tira a "foto" dos aplausos/vaias acumulados nas recomendações
// reais da comunidade (postadas em /recommendations) e grava o top 10 de
// cada categoria. Reações que chegarem depois do prazo não contam mais.
async function freezeNominationsAndAdvance(categories: AwardCategory[], config: AwardsConfig): Promise<void> {
  const [recsSnap, countsSnap] = await Promise.all([
    getDocs(collection(db, "communityRecs")),
    getDocs(collection(db, "rec_reaction_counts")),
  ]);

  const countsById = new Map<string, { likes: number; boos: number }>();
  countsSnap.docs.forEach((d) => {
    const data = d.data() as { likes?: number; boos?: number };
    countsById.set(d.id, { likes: data.likes ?? 0, boos: data.boos ?? 0 });
  });

  const byTheme = new Map<string, { title: string; likes: number; boos: number }[]>();
  recsSnap.docs.forEach((d) => {
    const r = d.data() as { title?: string; type?: string };
    if (!r.title || !r.type) return;
    const counts = countsById.get(`community_${d.id}`) ?? { likes: 0, boos: 0 };
    const themeId = slugifyType(r.type);
    if (!byTheme.has(themeId)) byTheme.set(themeId, []);
    byTheme.get(themeId)!.push({ title: r.title, likes: counts.likes, boos: counts.boos });
  });

  const nomineesByCategoryId = new Map<string, string[]>();
  for (const c of categories) {
    const items = byTheme.get(c.themeId) ?? [];
    const ranked = items
      .filter((i) => (c.kind === "melhor" ? i.likes > 0 : i.boos > 0))
      .sort((a, b) => (c.kind === "melhor" ? b.likes - a.likes : b.boos - a.boos));
    nomineesByCategoryId.set(
      c.id,
      ranked.slice(0, 10).map((i) => i.title),
    );
  }

  const nextIndicacaoDeadline = (config.recomendacaoDeadline ?? Date.now()) + WEEK_MS;

  await runTransaction(db, async (tx) => {
    const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const freshSnap = await tx.get(configRef);
    const fresh = freshSnap.exists()
      ? { ...DEFAULT_CONFIG, ...(freshSnap.data() as Partial<AwardsConfig>) }
      : DEFAULT_CONFIG;
    if (fresh.phase !== "recomendacao") return; // outro cliente já avançou

    const catRefs = categories.map((c) => doc(db, CATALOG_COLLECTION, c.id));
    for (const ref of catRefs) await tx.get(ref); // Firestore exige ler antes de escrever

    categories.forEach((c) => {
      tx.set(
        doc(db, CATALOG_COLLECTION, c.id),
        { nominees: nomineesByCategoryId.get(c.id) ?? [] },
        { merge: true },
      );
    });
    tx.set(configRef, { phase: "indicacao", indicacaoDeadline: nextIndicacaoDeadline }, { merge: true });
  });
}

// Fase 1 → 2: pega os 5 mais votados de cada categoria na fase "indicacao".
async function advanceIndicacaoToFinal(categories: AwardCategory[], config: AwardsConfig): Promise<void> {
  const snap = await getDocs(query(collection(db, "award_votes_indicacao"), where("confirmed", "==", true)));
  const allVotes = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<AwardVoteRecord, "uid">) }));

  const top5ByCategoryId = new Map<string, string[]>();
  categories.forEach((c) => {
    top5ByCategoryId.set(
      c.id,
      getAwardResults(c.id, allVotes)
        .slice(0, 5)
        .map((r) => r.nominee),
    );
  });

  const nextFinalDeadline = (config.indicacaoDeadline ?? Date.now()) + WEEK_MS;

  await runTransaction(db, async (tx) => {
    const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const freshSnap = await tx.get(configRef);
    const fresh = freshSnap.exists()
      ? { ...DEFAULT_CONFIG, ...(freshSnap.data() as Partial<AwardsConfig>) }
      : DEFAULT_CONFIG;
    if (fresh.phase !== "indicacao") return;

    const catRefs = categories.map((c) => doc(db, CATALOG_COLLECTION, c.id));
    for (const ref of catRefs) await tx.get(ref);

    categories.forEach((c) => {
      const top5 = top5ByCategoryId.get(c.id) ?? [];
      tx.set(doc(db, CATALOG_COLLECTION, c.id), { nominees: top5, finalists: top5 }, { merge: true });
    });
    tx.set(configRef, { phase: "final", finalDeadline: nextFinalDeadline }, { merge: true });
  });
}

// Fase 2 → 3: só libera a tela de resultado (os votos finais já dão o vencedor).
async function advanceFinalToResultado(): Promise<void> {
  await runTransaction(db, async (tx) => {
    const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const freshSnap = await tx.get(configRef);
    const fresh = freshSnap.exists()
      ? { ...DEFAULT_CONFIG, ...(freshSnap.data() as Partial<AwardsConfig>) }
      : DEFAULT_CONFIG;
    if (fresh.phase !== "final") return;
    tx.set(configRef, { phase: "resultado" }, { merge: true });
  });
}

/*
 * ── Regras de segurança OBRIGATÓRIAS (Console do Firebase → Firestore → Regras):
 *
 * match /award_votes_indicacao/{uid} {
 *   allow read: if request.auth != null;
 *   allow create, update, delete: if request.auth != null && request.auth.uid == uid;
 * }
 * match /award_votes_final/{uid} {
 *   allow read: if request.auth != null;
 *   allow create, update, delete: if request.auth != null && request.auth.uid == uid;
 * }
 * match /awards_config/{id} {
 *   allow read: if request.auth != null;
 *   // Qualquer usuário autenticado pode "puxar" a virada de fase (é assim que
 *   // o cron preguiçoso funciona sem Cloud Functions) — mas só depois do
 *   // prazo, e a lógica de qual usuário "ganha a corrida" já é protegida
 *   // pela transação no código. Ainda assim, alguém malicioso tecnicamente
 *   // poderia escrever nesse doc fora de hora; se isso virar problema, a
 *   // solução correta é mover essa lógica pra uma Cloud Function.
 *   allow write: if request.auth != null;
 * }
 * match /awards_catalog/{id} {
 *   allow read: if request.auth != null;
 *   allow write: if request.auth != null;
 * }
 */