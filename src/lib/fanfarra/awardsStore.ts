import { useEffect, useState, useSyncExternalStore } from "react";

import {
  doc,
  deleteDoc,
  deleteField,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { stripUndefined } from "./firestoreUtils";
import { pushNotification } from "./extras";
import { getRecReactionCountsAsOf } from "./recReactions";
import { CATALOG } from "./recommendations";
import { recordAwardWin } from "./awardsHistoryStore";
import { toast } from "sonner";

// ===== Configuração da edição (ano/título/fase/prazos) — editável no Console do Firebase =====
const CONFIG_COLLECTION = "awards_config";
const CONFIG_DOC_ID = "current";

// Fases do funil: recomendação → indicação → final → resultado
export type AwardsPhase = "recomendacao" | "indicacao" | "final" | "resultado";

export interface AwardsConfig {
  year: number;
  title: string;
  phase: AwardsPhase;
 // Timestamps (Date.now()) definidos MANUALMENTE por você no painel admin
  // — quando cada fase deve virar automaticamente.
  recomendacaoDeadline?: number;
  indicacaoDeadline?: number;
  finalDeadline?: number;
  // Abertura de cada fase (quando a votação passa a ficar liberada pro
  // usuário votar). Se não for definida, a fase já entra liberada assim
  // que virar.
  recomendacaoOpen?: number;
  indicacaoOpen?: number;
  finalOpen?: number;
  // Marca quando a edição atual começou (gravado por startNewCycle). Usado
  // pra ignorar aplausos/vaias de edições anteriores ao recontar indicados.
  cycleStart?: number;
}

const DEFAULT_CONFIG: AwardsConfig = {
  year: 2025,
  title: "Fanfarra Awards 2025",
  phase: "recomendacao",
};

// Blindagem: campos numéricos podem ter sido salvos como texto (string) no
// Console do Firebase por engano — isso faz "prazo + WEEK_MS" virar
// concatenação de texto em vez de soma. Essa função garante number sempre.
function normalizeAwardsConfig(raw: Partial<AwardsConfig> | undefined): AwardsConfig {
  const merged = { ...DEFAULT_CONFIG, ...raw };
  return {
    ...merged,
    year: Number(merged.year),
    recomendacaoDeadline:
      merged.recomendacaoDeadline !== undefined ? Number(merged.recomendacaoDeadline) : undefined,
    indicacaoDeadline:
      merged.indicacaoDeadline !== undefined ? Number(merged.indicacaoDeadline) : undefined,
    finalDeadline:
      merged.finalDeadline !== undefined ? Number(merged.finalDeadline) : undefined,
    recomendacaoOpen:
      merged.recomendacaoOpen !== undefined ? Number(merged.recomendacaoOpen) : undefined,
    indicacaoOpen:
      merged.indicacaoOpen !== undefined ? Number(merged.indicacaoOpen) : undefined,
    finalOpen:
      merged.finalOpen !== undefined ? Number(merged.finalOpen) : undefined,
    cycleStart: merged.cycleStart !== undefined ? Number(merged.cycleStart) : undefined,
  };
}

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
      configCache = normalizeAwardsConfig(snap.exists() ? (snap.data() as Partial<AwardsConfig>) : undefined);
      notifyConfig();
    },
    (err) => {
      console.error("Erro ao carregar configuração do Awards:", err);
      toast.error("Não foi possível carregar os Awards. Verifique sua conexão e tente de novo.");
    },
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

// Ação administrativa: define/edita manualmente o prazo de UMA fase
// específica. Não mexe na fase atual nem nas outras — só grava o horário
// exato em que aquela fase deve fechar. Você decide a data; o app só fica
// de olho e vira sozinho quando o relógio passa desse valor (ou você força
// pelo botão "Forçar verificação de fase agora").
// Ação administrativa: define/edita manualmente a ABERTURA de UMA fase
// específica (quando a votação passa a ficar liberada pro usuário votar).
export async function setPhaseOpen(
  phase: "recomendacao" | "indicacao" | "final",
  timestamp: number,
): Promise<void> {
  const field =
    phase === "recomendacao"
      ? "recomendacaoOpen"
      : phase === "indicacao"
        ? "indicacaoOpen"
        : "finalOpen";
  await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), { [field]: timestamp }, { merge: true });
}

// Ação administrativa: define/edita manualmente o PRAZO (deadline) de UMA
// fase específica — quando ela deve virar automaticamente para a próxima.
export async function setPhaseDeadline(
  phase: "recomendacao" | "indicacao" | "final",
  timestamp: number,
): Promise<void> {
  const field =
    phase === "recomendacao"
      ? "recomendacaoDeadline"
      : phase === "indicacao"
        ? "indicacaoDeadline"
        : "finalDeadline";
  await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), { [field]: timestamp }, { merge: true });
}

// Ação administrativa: (re)inicia uma edição do Awards do zero — abre a fase
// de recomendação (zerando indicados/finalistas da edição anterior) e grava
// o prazo dela. Os prazos de "indicacao" e "final" continuam sendo o que
// você já tiver definido com setPhaseDeadline (ou undefined, até você
// definir manualmente antes de a fase chegar lá).
// Apaga TODOS os documentos de uma coleção de votos (todos os usuários).
// Usada só pelo startNewCycle, pra zerar os votos da edição anterior.
async function deleteAllDocsInCollection(collectionName: string): Promise<void> {
  const snap = await getDocs(collection(db, collectionName));
  const docs = snap.docs;
  const CHUNK = 400; // limite do writeBatch é 500 operações
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = writeBatch(db);
    docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function startNewCycle(categories: AwardCategory[], recomendacaoDeadline: number): Promise<void> {
  // Zera os votos de TODO MUNDO nas duas fases — os votos de uma edição
  // não podem valer pra próxima. Feito fora da transação porque pode ser
  // uma quantidade grande de documentos (um por usuário que já votou).
  await Promise.all([
    deleteAllDocsInCollection("award_votes_indicacao"),
    deleteAllDocsInCollection("award_votes_final"),
  ]);

  const cycleStart = Date.now();

  await runTransaction(db, async (tx) => {
    const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    await tx.get(configRef);

    const catRefs = categories.map((c) => doc(db, CATALOG_COLLECTION, c.id));
    for (const ref of catRefs) await tx.get(ref);

    categories.forEach((c) => {
      tx.set(
        doc(db, CATALOG_COLLECTION, c.id),
        { nominees: [], nomineeDetails: [], finalists: [], finalistDetails: [] },
        { merge: true },
      );
    });

    // Limpa os prazos/aberturas das fases seguintes da edição anterior —
    // senão eles continuam "vencidos" e o app avança tudo de uma vez até
    // "resultado" de novo, assim que a fase de recomendação virar.
    tx.set(
      configRef,
      {
        phase: "recomendacao",
        recomendacaoDeadline,
        cycleStart,
        recomendacaoOpen: deleteField(),
        indicacaoOpen: deleteField(),
        indicacaoDeadline: deleteField(),
        finalOpen: deleteField(),
        finalDeadline: deleteField(),
      },
      { merge: true },
    );
  });
}

// ===== Catálogo de categorias/indicados — editável no Console do Firebase =====
const CATALOG_COLLECTION = "awards_catalog";

export type AwardCategoryKind = "melhor" | "pior";

export interface AwardNomineeDetail {
  itemId: string; // mesmo id usado em /rec/$id (community_xxx ou id do catálogo)
  title: string;
  type?: string;
  cover?: string;
  likes: number;
  boos: number;
}

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
  nomineeDetails?: AwardNomineeDetail[]; // capa/tipo/aplausos-vaias dos indicados, pro card
  finalistDetails?: AwardNomineeDetail[]; // idem, pros finalistas
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
          nomineeDetails: data.nomineeDetails,
          finalistDetails: data.finalistDetails,
        } as AwardCategory;
      });
      notifyCategories();
    },
    (err) => {
      console.error("Erro ao carregar categorias do Awards:", err);
      toast.error("Não foi possível carregar as categorias do Awards. Verifique sua conexão e tente de novo.");
    },
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
  confirmedAt?: number;
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

  async function confirm(notifyText: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Você precisa estar logado para confirmar os votos.");
    const previous = cache;
    const next: AwardVoteDoc = { ...cache, confirmed: true, confirmedAt: Date.now(), year: configCache.year };
    cache = next;
    notify();
    try {
      await setDoc(doc(db, phaseCollection, uid), stripUndefined(next), { merge: true });
    } catch (err) {
      cache = previous;
      notify();
      console.error(`Erro ao confirmar votos (${phaseCollection}):`, err);
      throw err;
    }
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
export async function confirmAwardVotes(phase: VotePhase): Promise<void> {
  const label = phase === "indicacao" ? "indicados" : "finalistas";
  await storeFor(phase).confirm(`Seu voto nos ${label} do ${configCache.title} foi registrado! 🏆`);
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

// Compara o themeId da categoria com o slug do tipo de uma obra. Normaliza os
// dois lados (evita bug de acento/maiúscula no Console) e aceita themeId com
// vários tipos juntos, separados por vírgula ou barra — ex: categoria "Pior
// Manga/Manhwa/Manhua" pode ter themeId = "manga,manhwa,manhua".
function themeIdMatches(themeId: string, typeSlug: string): boolean {
  const normalized = slugifyType(themeId);
  if (normalized === "*" || normalized === "todos" || normalized === "all") return true;
  return themeId
    .split(/[,/]/)
    .map((part) => slugifyType(part))
    .includes(typeSlug);
}

// Diz se a fase atual ainda está "rodando" de verdade — ou seja, tem um
// prazo próprio e esse prazo ainda não passou. Enquanto isso for verdade,
// o agendamento da PRÓXIMA edição não pode atropelar o ciclo em andamento.
function isCycleActive(config: AwardsConfig, now: number): boolean {
  if (config.phase === "recomendacao") {
    return !!config.recomendacaoDeadline && now < config.recomendacaoDeadline;
  }
  if (config.phase === "indicacao") {
    return !!config.indicacaoDeadline && now < config.indicacaoDeadline;
  }
  if (config.phase === "final") {
    return !!config.finalDeadline && now < config.finalDeadline;
  }
  return false; // "resultado" já terminou — pode abrir a próxima
}

export async function checkAndAdvanceAwardsPhase(
  categories: AwardCategory[],
  opts: { force?: boolean } = {},
): Promise<void> {
  if (categories.length === 0) return;

  const configSnap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID));
  const config = normalizeAwardsConfig(configSnap.exists() ? (configSnap.data() as Partial<AwardsConfig>) : undefined);
  const now = Date.now();

 if (config.phase === "recomendacao") {
    const deadline = config.recomendacaoDeadline;
    if (!opts.force && (!deadline || now < deadline)) return;
    await freezeNominationsAndAdvance(categories, config);
  } else if (config.phase === "indicacao") {
    const deadline = config.indicacaoDeadline;
    if (!opts.force && (!deadline || now < deadline)) return;
    await advanceIndicacaoToFinal(categories, config);
  } else if (config.phase === "final") {
    const deadline = config.finalDeadline;
    if (!opts.force && (!deadline || now < deadline)) return;
    await advanceFinalToResultado(categories, config);
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
  // Prazo real da fase de recomendação — é o corte que decide o que conta ou não.
  const freezeDeadline = config.recomendacaoDeadline ?? Date.now();

 const [recsSnap, countsById] = await Promise.all([
    getDocs(collection(db, "communityRecs")),
    // conta TODOS os aplausos/vaias já feitos até o prazo, mesmo de
    // edições anteriores — não tem corte por edição, só pelo prazo mesmo.
    getRecReactionCountsAsOf(freezeDeadline),
  ]);

  // Foco 100% nas recomendações postadas por usuários reais.
  const byTheme = new Map<string, AwardNomineeDetail[]>();
  recsSnap.docs.forEach((d) => {
    const r = d.data() as { title?: string; type?: string; cover?: string };
    if (!r.title || !r.type) return;
    const itemId = `community_${d.id}`;
    const counts = countsById.get(itemId) ?? { likes: 0, boos: 0 };
    const typeSlug = slugifyType(r.type);
    if (!byTheme.has(typeSlug)) byTheme.set(typeSlug, []);
    byTheme.get(typeSlug)!.push({ itemId, title: r.title, type: r.type, cover: r.cover, likes: counts.likes, boos: counts.boos });
  });

  const nomineesByCategoryId = new Map<string, AwardNomineeDetail[]>();
  for (const c of categories) {
    const items: AwardNomineeDetail[] = [];
    byTheme.forEach((list, typeSlug) => {
      if (themeIdMatches(c.themeId, typeSlug)) items.push(...list);
    });
    const ranked = items
      // mesmo com poucos aplausos/vaias (1 já basta), a obra entra na disputa
      .filter((i) => (c.kind === "melhor" ? i.likes > 0 : i.boos > 0))
      .sort((a, b) => (c.kind === "melhor" ? b.likes - a.likes : b.boos - a.boos));
    nomineesByCategoryId.set(c.id, ranked.slice(0, 10));
  }

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
      const details = nomineesByCategoryId.get(c.id) ?? [];
      tx.set(
        doc(db, CATALOG_COLLECTION, c.id),
        stripUndefined({ nominees: details.map((d) => d.title), nomineeDetails: details }),
        { merge: true },
      );
    });
    tx.set(configRef, { phase: "indicacao" }, { merge: true });
  });
}

// Fase 1 → 2: pega os 5 mais votados de cada categoria na fase "indicacao".
async function advanceIndicacaoToFinal(categories: AwardCategory[], config: AwardsConfig): Promise<void> {
  const deadline = config.indicacaoDeadline ?? Date.now();
  const snap = await getDocs(query(collection(db, "award_votes_indicacao"), where("confirmed", "==", true)));
  const allVotes = snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() as Omit<AwardVoteRecord, "uid">) }))
    // votos confirmados depois do prazo não contam pra avançar pra final;
    // votos antigos sem confirmedAt (de antes dessa correção) continuam valendo.
    .filter((v) => v.confirmedAt === undefined || v.confirmedAt <= deadline);

  const top5ByCategoryId = new Map<string, string[]>();
  const top5DetailsByCategoryId = new Map<string, AwardNomineeDetail[]>();
  categories.forEach((c) => {
    const top5 = getAwardResults(c.id, allVotes).slice(0, 5).map((r) => r.nominee);
    top5ByCategoryId.set(c.id, top5);

    const detailsByTitle = new Map((c.nomineeDetails ?? []).map((d) => [d.title, d]));
    top5DetailsByCategoryId.set(
      c.id,
      top5.map((title) => detailsByTitle.get(title) ?? { itemId: title, title, likes: 0, boos: 0 }),
    );
  });

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
      const top5Details = top5DetailsByCategoryId.get(c.id) ?? [];
      tx.set(
        doc(db, CATALOG_COLLECTION, c.id),
        stripUndefined({ nominees: top5, finalists: top5, finalistDetails: top5Details }),
        { merge: true },
      );
    });
    tx.set(configRef, { phase: "final" }, { merge: true });
  });
}

// Fase 2 → 3: calcula o vencedor de cada categoria a partir dos votos finais
// confirmados e grava cada vitória no histórico PERMANENTE (awards_history)
// — é isso que faz a coroinha de "já foi vencedora" aparecer na obra em
// qualquer lugar do app (biblioteca, comunidade, indicados...) mesmo depois
// que essa edição do Awards terminar e o app voltar ao normal. Só depois
// disso libera a tela de resultado.
async function advanceFinalToResultado(categories: AwardCategory[], config: AwardsConfig): Promise<void> {
  const deadline = config.finalDeadline ?? Date.now();
  const snap = await getDocs(query(collection(db, "award_votes_final"), where("confirmed", "==", true)));
  const allVotes = snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() as Omit<AwardVoteRecord, "uid">) }))
    // mesmo princípio das outras viradas: voto confirmado depois do prazo não conta.
    .filter((v) => v.confirmedAt === undefined || v.confirmedAt <= deadline);

  for (const c of categories) {
    const winner = getAwardResults(c.id, allVotes)[0];
    if (!winner) continue; // categoria sem nenhum voto — ninguém venceu, nada a gravar
    await recordAwardWin(winner.nominee, {
      year: config.year,
      categoryId: c.id,
      categoryName: c.name,
      emoji: c.emoji,
    });
  }

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