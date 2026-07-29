import { useEffect, useState, useSyncExternalStore } from "react";
import { Medal, BookMarked, Library, CircleCheck, Flame, Vote, Trophy, Target, Star, Gift, type LucideIcon } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { syncPublicProfile } from "./publicProfiles";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { generateId } from "./uuid";
import { stripUndefined } from "./firestoreUtils";
import { IN_PROGRESS_STATUSES } from "./types";
import type { Work } from "./types";

// ===== Settings =====
export interface Settings {
  notif_paused: boolean;
  notif_events: boolean;
  notif_news: boolean;
  notif_sound: boolean;
  notif_episodes: boolean;
  privacy_public: boolean;
  privacy_library: boolean;
  privacy_email: boolean;
  sync_firebase: boolean;
  lastSync: number | null;
  pro: boolean;
  animations: boolean;
  libraryColumns: 2 | 3;
  theme: "default" | "lunar" | "aurora";
  mode: "dark" | "light";

}

const SETTINGS_COLLECTION = "settings";
const DEFAULT_SETTINGS: Settings = {
  notif_paused: true,
  notif_events: true,
  notif_news: true,
  notif_sound: true,
  notif_episodes: true,
  privacy_public: false,
  privacy_library: false,
  privacy_email: false,
  sync_firebase: true,
  lastSync: null,
  pro: false,
  animations: true,
  libraryColumns: 2,
  theme: "default",
  mode: "dark",
};
let settingsCache: Settings = DEFAULT_SETTINGS;
let settingsUnsub: (() => void) | null = null;
const settingsListeners = new Set<() => void>();
let settingsCurrentUid: string | null = null;

function notifySettingsListeners() {
  settingsListeners.forEach((l) => l());
}

onAuthStateChanged(auth, (user) => {
  if (settingsUnsub) {
    settingsUnsub();
    settingsUnsub = null;
  }
  settingsCache = DEFAULT_SETTINGS;
  settingsCurrentUid = user?.uid ?? null;
  notifySettingsListeners();
  if (!user) return;

  const ref = doc(db, SETTINGS_COLLECTION, user.uid);
  settingsUnsub = onSnapshot(ref, (snap) => {
    settingsCache = snap.exists()
      ? { ...DEFAULT_SETTINGS, ...(snap.data() as Settings) }
      : DEFAULT_SETTINGS;
    notifySettingsListeners();
  });
});

export function useSettings(): Settings {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const v = useSyncExternalStore(
    (cb) => {
      settingsListeners.add(cb);
      return () => settingsListeners.delete(cb);
    },
    () => settingsCache,
    () => DEFAULT_SETTINGS,
  );
  return mounted ? v : DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Settings>) {
  if (!settingsCurrentUid) return;
  settingsCache = { ...settingsCache, ...patch };
  notifySettingsListeners();
  await setDoc(doc(db, SETTINGS_COLLECTION, settingsCurrentUid), stripUndefined(patch), {
    merge: true,
  });
}

// ===== Notifications =====
export interface Notification {
  id: string;
  icon:
  | "pause-circle"
  | "award"
  | "bar-chart"
  | "vote"
  | "check-circle"
  | "calendar-clock"
  | "user-plus"
  | "users"
  | "heart"
  | "eye"
  | "message-circle"
  | "play-circle";
  text: string;
  ts: number;
  read: boolean;
}

const NOTIF_COLLECTION = "notifications";

let notifCache: Notification[] = [];
let notifUnsub: (() => void) | null = null;
const notifListeners = new Set<() => void>();
let notifCurrentUid: string | null = null;
let notifLoaded = false;

function notifyNotifListeners() {
  notifListeners.forEach((l) => l());
}

// escuta login/logout e (re)assina a coleção de notificações do usuário
onAuthStateChanged(auth, (user) => {
  if (notifUnsub) {
    notifUnsub();
    notifUnsub = null;
  }
  notifCache = [];
  notifLoaded = false;
  notifCurrentUid = user?.uid ?? null;
  notifyNotifListeners();
  if (!user) return;

  const q = query(collection(db, NOTIF_COLLECTION), where("uid", "==", user.uid));

  notifUnsub = onSnapshot(q, (snap) => {
    notifCache = snap.docs
      .map((d) => {
        const data = d.data() as Partial<Notification>;
        return {
          id: d.id,
          icon: data.icon,
          text: data.text,
          ts: data.ts,
          read: !!data.read,
        } as Notification;
      })
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50);
    notifLoaded = true;
    notifyNotifListeners();
  });
});

const EMPTY_NOTIFICATIONS: Notification[] = [];

export function useNotifications(): Notification[] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const v = useSyncExternalStore(
    (cb) => {
      notifListeners.add(cb);
      return () => notifListeners.delete(cb);
    },
    () => notifCache,
    () => EMPTY_NOTIFICATIONS,
  );
  return mounted ? v : EMPTY_NOTIFICATIONS;
}

export async function markAllNotificationsRead() {
  if (!notifCurrentUid) return;
  const unread = notifCache.filter((n) => !n.read);
  if (!unread.length) return;
  const batch = writeBatch(db);
  for (const n of unread) {
    batch.update(doc(db, NOTIF_COLLECTION, n.id), { read: true });
  }
  await batch.commit();
}

export async function pushNotification(n: Omit<Notification, "id" | "ts" | "read">) {
  if (!notifCurrentUid) return;

  // evita duplicata no mesmo dia
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const alreadyToday = notifCache.some(
    (e) => e.text === n.text && new Date(e.ts).toISOString().slice(0, 10) === todayPrefix,
  );
  if (alreadyToday) return;

  const id = generateId();
  await setDoc(
    doc(db, NOTIF_COLLECTION, id),
    stripUndefined({
      uid: notifCurrentUid,
      icon: n.icon,
      text: n.text,
      ts: Date.now(),
      read: false,
      pushed: false, // o cron (scripts/cron.mjs) usa essa flag pra saber o que ainda precisa virar push real
    }),
  );
}

export function checkAutoNotifications(works: Work[]) {
  const now = Date.now();
  const threeDays = 1000 * 60 * 60 * 24 * 3;
  const sevenDays = 1000 * 60 * 60 * 24 * 7;

  works.forEach((w) => {
    const idleSince = now - w.updatedAt;

    // Obra pausada há mais de 3 dias
    if (w.status === "Pausado" && idleSince > threeDays) {
      pushNotification({
        icon: "pause-circle",
        text: `"${w.title}" está pausado há ${Math.floor(idleSince / (1000 * 60 * 60 * 24))} dias. Que tal continuar?`,
      });
    }

    // Obra em andamento sem atualização há 7 dias
    if ((IN_PROGRESS_STATUSES as readonly string[]).includes(w.status) && idleSince > sevenDays) {
      pushNotification({
        icon: "calendar-clock",
        text: `Você não atualiza "${w.title}" há uma semana.`,
      });
    }
  });
}

// ===== Profile =====
export interface Profile {
  username: string;
  email: string;
  bio: string;
  avatar?: string;
  coverImage?: string;
  statusText?: string;
  tags?: string[];
  socialLinks?: { platform: string; url: string }[];
  streakDays: number;
  lastActiveDate: string | null;
  earnedBadgeIds: string[];
}

const PROFILES_COLLECTION = "profiles";
const DEFAULT_PROFILE: Profile = {
  username: "fan_user",
  email: "fan@fanfarra.app",
  bio: "Mergulhada no universo fandom ✦",
  tags: [],
  socialLinks: [],
  streakDays: 0,
  lastActiveDate: null,
  earnedBadgeIds: [],
};

let profileCache: Profile = DEFAULT_PROFILE;
let profileUnsub: (() => void) | null = null;
const profileListeners = new Set<() => void>();
let profileCurrentUid: string | null = null;
let profileLoaded = false;

// Usado pelo cadastro (signUpWithEmail, em auth.ts) pra avisar este listener
// pra NÃO tentar adivinhar o apelido a partir de user.displayName — o
// próprio cadastro já cria o documento de perfil com o apelido certo, então
// aqui só evitamos a corrida em que este listener rodava antes e gravava
// por cima com um valor errado.
let skipNextProfileAutoSeed = false;
export function setSkipNextProfileAutoSeed(skip: boolean) {
  skipNextProfileAutoSeed = skip;
}

function notifyProfileListeners() {
  profileListeners.forEach((l) => l());
}

// Cada conta (uid) tem seu próprio documento no Firestore — assim o perfil
// acompanha a conta em qualquer aparelho/navegador, em vez de ficar preso
// no armazenamento local de um único dispositivo.
// Ao logar, se ainda não existir um perfil salvo para aquele uid, ele é
// criado a partir dos dados reais da conta (nome e e-mail do cadastro/login).
onAuthStateChanged(auth, async (user) => {
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }
  profileCache = DEFAULT_PROFILE;
  profileLoaded = false;
  profileCurrentUid = user?.uid ?? null;
  notifyProfileListeners();
  if (!user) return;

  const ref = doc(db, PROFILES_COLLECTION, user.uid);
  const skipSeed = skipNextProfileAutoSeed;
  skipNextProfileAutoSeed = false;

  if (!skipSeed) {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      const seed: Profile = {
        ...DEFAULT_PROFILE,
        username: user.displayName || user.email?.split("@")[0] || DEFAULT_PROFILE.username,
        email: user.email ?? DEFAULT_PROFILE.email,
      };
      await setDoc(ref, stripUndefined(seed));
    } else {
      const data = existing.data() as Profile;
      if (user.email && data.email !== user.email) {
        await updateDoc(ref, { email: user.email });
      }
    }
  }

  profileUnsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      profileCache = { ...DEFAULT_PROFILE, ...(snap.data() as Profile) };
      syncPublicProfile(user.uid, {
        username: profileCache.username,
        avatar: profileCache.avatar,
        bio: profileCache.bio,
        coverImage: profileCache.coverImage,
        statusText: profileCache.statusText,
        tags: profileCache.tags,
        socialLinks: profileCache.socialLinks,
      });
    }
    profileLoaded = true;
    notifyProfileListeners();
  });
});

export function useProfile(): Profile {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const v = useSyncExternalStore(
    (cb) => {
      profileListeners.add(cb);
      return () => profileListeners.delete(cb);
    },
    () => profileCache,
    () => DEFAULT_PROFILE,
  );
  return mounted ? v : DEFAULT_PROFILE;
}

// Fica "false" até o perfil E as notificações terem carregado de verdade do
// Firestore. Usado pra travar checagens de selo até termos dados confiáveis
// (evita recriar selos/notificações duplicadas a cada refresh da página).
export function useAppDataReady(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const profileReady = useSyncExternalStore(
    (cb) => {
      profileListeners.add(cb);
      return () => profileListeners.delete(cb);
    },
    () => profileLoaded,
    () => false,
  );
  const notifReady = useSyncExternalStore(
    (cb) => {
      notifListeners.add(cb);
      return () => notifListeners.delete(cb);
    },
    () => notifLoaded,
    () => false,
  );
  return mounted && profileReady && notifReady;
}

export async function updateProfile(patch: Partial<Profile>) {
  if (!profileCurrentUid) return;
  profileCache = { ...profileCache, ...patch };
  notifyProfileListeners();
  await setDoc(doc(db, PROFILES_COLLECTION, profileCurrentUid), stripUndefined(patch), {
    merge: true,
  });
}

export async function tickStreak() {
  if (!profileCurrentUid) return;
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const profile = profileCache;

  if (profile.lastActiveDate === today) return; // já registrou hoje

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak =
    profile.lastActiveDate === yesterday
      ? profile.streakDays + 1 // dia consecutivo
      : 1; // quebrou o streak, reinicia

  await updateProfile({ streakDays: newStreak, lastActiveDate: today });
}

// ===== Badges =====
export interface Badge {
  id: string;
  Icon: LucideIcon;
  name: string;
  description: string;
}
export const ALL_BADGES: Badge[] = [
  { id: "first", Icon: Medal, name: "Primeira obra", description: "Adicione sua primeira obra" },
  { id: "ten", Icon: BookMarked, name: "10 obras", description: "Tenha 10 obras na biblioteca" },
  { id: "fifty", Icon: Library, name: "50 obras", description: "Tenha 50 obras na biblioteca" },
  { id: "first_done", Icon: CircleCheck, name: "Primeira concluída", description: "Conclua sua primeira obra" },
  { id: "streak7", Icon: Flame, name: "7 dias de streak", description: "Use o app por 7 dias seguidos" },
  { id: "streak30", Icon: Flame, name: "30 dias de streak", description: "Use o app por 30 dias seguidos" },
  { id: "awards", Icon: Vote, name: "Votou no Awards", description: "Participe do Fanfarra Awards" },
  { id: "winner", Icon: Trophy, name: "Vencedor Awards", description: "Indicou um vencedor no Awards" },
  { id: "challenge", Icon: Target, name: "Desafio Fandom", description: "Conclua um Desafio Fandom" },
  { id: "rated20", Icon: Star, name: "Avaliou 20 obras", description: "Avalie 20 obras diferentes" },
  { id: "pro", Icon: Gift, name: "Assinante PRO", description: "Apoie o app como assinante PRO" },
];

type BadgeStats = {
  total: number;
  completed: number;
  rated: number;
  streak: number;
  pro: boolean;
};

// Calcula quais selos as estatísticas atuais qualificam — SEM side effects.
// Segura pra chamar em qualquer render (useMemo, JSX, etc.).
function computeQualifyingBadgeIds(stats: BadgeStats): string[] {
  const computed: string[] = [];
  if (stats.total >= 1) computed.push("first");
  if (stats.total >= 10) computed.push("ten");
  if (stats.total >= 50) computed.push("fifty");
  if (stats.completed >= 1) computed.push("first_done");
  if (stats.streak >= 7) computed.push("streak7");
  if (stats.streak >= 30) computed.push("streak30");
  if (stats.rated >= 20) computed.push("rated20");
  if (stats.pro) computed.push("pro");
  return computed;
}

// Retorna a união de selos (computados agora + salvos antes, tipo "awards"
// e "challenge", que não vêm de stats). Só leitura, sem gravar nada.
export function earnedBadges(stats: BadgeStats): string[] {
  const computed = computeQualifyingBadgeIds(stats);
  const already = profileCache.earnedBadgeIds ?? [];
  return [...new Set([...already, ...computed])];
}

// Efeito colateral: persiste selos novos + dispara notificação.
// IMPORTANTE: só chamar de dentro de um useEffect, nunca durante o render.
export function syncEarnedBadges(stats: BadgeStats): void {
  if (!profileLoaded || !notifLoaded) return; // espera os dados reais chegarem do Firestore
  const computed = computeQualifyingBadgeIds(stats);
  const already = profileCache.earnedBadgeIds ?? [];
  const newOnes = computed.filter((id) => !already.includes(id));
  if (newOnes.length === 0) return;

  const merged = [...already, ...newOnes];
  updateProfile({ earnedBadgeIds: merged });

  newOnes.forEach((id) => {
    const badge = ALL_BADGES.find((b) => b.id === id);
    if (badge) {
      pushNotification({
        icon: "award",
        text: `Você ganhou o selo "${badge.name}"!`,
      });
    }
  });
}
// ===== Challenges =====
export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  type: string;
  endsAt: number;
  joined: boolean;
  completed: boolean;
}

const CHALLENGES_CATALOG_COLLECTION = "challenges_catalog";
const USER_CHALLENGES_COLLECTION = "user_challenges";

interface ChallengeCatalogEntry {
  id: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  type: string;
  endsAt: number;
}

interface UserChallengeState {
  challengeId: string;
  joined: boolean;
  completed: boolean;
}

let challengesCatalogCache: ChallengeCatalogEntry[] = [];
let userChallengesCache: Map<string, UserChallengeState> = new Map();
let challengesCache: Challenge[] = [];
let catalogUnsub: (() => void) | null = null;
let userChallengesUnsub: (() => void) | null = null;
const challengesListeners = new Set<() => void>();
let challengesCurrentUid: string | null = null;

function notifyChallengesListeners() {
  challengesListeners.forEach((l) => l());
}

function recomputeChallengesCache() {
  challengesCache = challengesCatalogCache.map((c) => {
    const state = userChallengesCache.get(c.id);
    return {
      ...c,
      joined: state?.joined ?? false,
      completed: state?.completed ?? false,
    };
  });
  notifyChallengesListeners();
}

let challengesHasUser = false;
let challengesDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectChallenges() {
  if (catalogUnsub || userChallengesUnsub || !challengesCurrentUid) return;

  // Catálogo de desafios: gerenciado direto no Firestore (Firebase Console),
  // sem precisar mexer em código pra criar/editar um desafio novo.
  const catalogQuery = query(collection(db, CHALLENGES_CATALOG_COLLECTION));
  catalogUnsub = onSnapshot(catalogQuery, (snap) => {
    challengesCatalogCache = snap.docs
      .map((d) => {
        const data = d.data() as Partial<ChallengeCatalogEntry>;
        if (!data.title || !data.description || !data.emoji || data.target == null || !data.type || data.endsAt == null) {
          console.warn(`[challenges_catalog] Documento "${d.id}" com campos faltando, ignorado.`);
          return null;
        }
        return { id: d.id, title: data.title, description: data.description, emoji: data.emoji, target: data.target, type: data.type, endsAt: data.endsAt };
      })
      .filter((c): c is ChallengeCatalogEntry => c !== null);
    recomputeChallengesCache();
  });

  const userChallengesQuery = query(
    collection(db, USER_CHALLENGES_COLLECTION),
    where("uid", "==", challengesCurrentUid),
  );
  userChallengesUnsub = onSnapshot(userChallengesQuery, (snap) => {
    const next = new Map<string, UserChallengeState>();
    snap.docs.forEach((d) => {
      const data = d.data() as Partial<UserChallengeState>;
      if (!data.challengeId) {
        console.warn(`[user_challenges] Documento "${d.id}" sem challengeId, ignorado.`);
        return;
      }
      next.set(data.challengeId, { challengeId: data.challengeId, joined: !!data.joined, completed: !!data.completed });
    });
    userChallengesCache = next;
    recomputeChallengesCache();
  });
}

function disconnectChallenges() {
  catalogUnsub?.();
  catalogUnsub = null;
  userChallengesUnsub?.();
  userChallengesUnsub = null;
}

onAuthStateChanged(auth, (user) => {
  disconnectChallenges();
  challengesCatalogCache = [];
  userChallengesCache = new Map();
  challengesCache = [];
  challengesCurrentUid = user?.uid ?? null;
  challengesHasUser = !!user;
  notifyChallengesListeners();
  if (challengesHasUser && challengesListeners.size > 0) connectChallenges();
});

const EMPTY_CHALLENGES: Challenge[] = [];

export function useChallenges(): Challenge[] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const v = useSyncExternalStore(
    (cb) => {
      if (challengesDisconnectTimer) {
        clearTimeout(challengesDisconnectTimer);
        challengesDisconnectTimer = null;
      }
      if (challengesListeners.size === 1) connectChallenges();
      return () => {
        challengesListeners.delete(cb);
        if (challengesListeners.size === 0) {
          challengesDisconnectTimer = setTimeout(disconnectChallenges, 15_000);
        }
      };
    },
    () => challengesCache,
    () => EMPTY_CHALLENGES,
  );
  return mounted ? v : EMPTY_CHALLENGES;
}

function userChallengeDocId(uid: string, challengeId: string) {
  return `${uid}_${challengeId}`;
}

export async function toggleChallenge(id: string) {
  if (!challengesCurrentUid) return;
  const current = userChallengesCache.get(id);
  const nextJoined = !(current?.joined ?? false);
  await setDoc(doc(db, USER_CHALLENGES_COLLECTION, userChallengeDocId(challengesCurrentUid, id)), {
    uid: challengesCurrentUid,
    challengeId: id,
    joined: nextJoined,
    completed: current?.completed ?? false,
  });
}

export async function checkChallengeCompletion(challengeId: string, done: number) {
  if (!challengesCurrentUid) return;
  const c = challengesCache.find((ch) => ch.id === challengeId);
  if (!c || !c.joined || c.completed) return;
  if (done < c.target) return;

  await setDoc(
    doc(db, USER_CHALLENGES_COLLECTION, userChallengeDocId(challengesCurrentUid, challengeId)),
    {
      uid: challengesCurrentUid,
      challengeId,
      joined: true,
      completed: true,
    },
  );

  pushNotification({
    icon: "check-circle",
    text: `Desafio "${c.title}" concluído! Você ganhou o selo 🎯`,
  });

  const already = profileCache.earnedBadgeIds ?? [];
  if (!already.includes("challenge")) {
    updateProfile({ earnedBadgeIds: [...already, "challenge"] });
  }
}
// ===== Awards =====
// As categorias, indicados e o ano/edição do Awards agora vêm do Firestore
// (coleções "awards_catalog" e "awards_config"), geridos direto no Console
// do Firebase — sem precisar mexer em código. Ver "./awardsStore".

// ===== Limpeza ao excluir conta =====
// Apaga tudo que "deleteUserAccount" (em auth.ts) ainda não cobria:
// o perfil, as configurações, as notificações e o progresso em desafios.
// Cada parte roda isolada (Promise.allSettled) pra uma falha pontual não
// travar a exclusão da conta inteira.
export async function deleteRemainingUserData(uid: string): Promise<void> {
  const notifQuery = query(collection(db, NOTIF_COLLECTION), where("uid", "==", uid));
  const challengesQuery = query(
    collection(db, USER_CHALLENGES_COLLECTION),
    where("uid", "==", uid),
  );

  const [notifSnap, challengesSnap] = await Promise.all([
    getDocs(notifQuery),
    getDocs(challengesQuery),
  ]);

  const deletions = [
    deleteDoc(doc(db, PROFILES_COLLECTION, uid)),
    deleteDoc(doc(db, SETTINGS_COLLECTION, uid)),
    ...notifSnap.docs.map((d) => deleteDoc(d.ref)),
    ...challengesSnap.docs.map((d) => deleteDoc(d.ref)),
  ];

  const results = await Promise.allSettled(deletions);
  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error(
        "Falha ao limpar parte dos dados restantes do usuário (perfil/configurações/notificações/desafios):",
        r.reason,
      );
    }
  });
}


