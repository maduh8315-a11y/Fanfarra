// Espelho público do perfil — só os campos que podem ficar visíveis pra
// qualquer usuário logado (sem e-mail). Alimenta a busca de pessoas e as
// telas de amigo/perfil público.
import {
  addDoc,
  collection,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  limit as fsLimit,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { stripUndefined } from "./firestoreUtils";
import type { PinnedWork } from "./types";
import type { TasteProfile } from "./tasteProfile";


const COLLECTION = "public_profiles";

export interface PublicProfile {
  uid: string;
  username: string;
  usernameLower: string;
  avatar?: string;
  bio?: string;
  coverImage?: string;
  statusText?: string;
  tags?: string[];
  socialLinks?: { platform: string; url: string }[];
  pinnedWorks?: PinnedWork[];
  tasteProfile?: TasteProfile;
  isPrivate?: boolean;
  whoCanFollow?: "everyone" | "nobody";
  whoCanFriendRequest?: "everyone" | "nobody";
  isChildAccount?: boolean;
}

// Chamado de dentro de extras.ts toda vez que o perfil do usuário atualiza.
export async function syncPublicProfile(
  uid: string,
  p: {
    username: string;
    avatar?: string;
    bio?: string;
    coverImage?: string;
    statusText?: string;
    tags?: string[];
    socialLinks?: { platform: string; url: string }[];
    pinnedWorks?: PinnedWork[];
    isPrivate?: boolean;
    whoCanFollow?: "everyone" | "nobody";
    whoCanFriendRequest?: "everyone" | "nobody";
    isChildAccount?: boolean;
  },
): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, uid),
    stripUndefined({
      uid,
      username: p.username,
      usernameLower: p.username.trim().toLowerCase(),
      avatar: p.avatar,
      bio: p.bio,
      coverImage: p.coverImage,
      statusText: p.statusText,
      tags: p.tags,
      socialLinks: p.socialLinks,
      pinnedWorks: p.pinnedWorks,
      isPrivate: p.isPrivate,
      whoCanFollow: p.whoCanFollow,
      whoCanFriendRequest: p.whoCanFriendRequest,
      isChildAccount: p.isChildAccount,
    }),
    { merge: true },
  );
}

export function usePublicProfile(uid: string | undefined): PublicProfile | null {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  useEffect(() => {
    setProfile(null);
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, COLLECTION, uid),
      (snap) => setProfile(snap.exists() ? (snap.data() as PublicProfile) : null),
      (err) => console.error("Erro ao buscar perfil público:", err),
    );
    return () => unsub();
  }, [uid]);
  return profile;
}

// Busca por prefixo de @username (case-insensitive) — tela de Amigos.
export async function searchUsersByUsername(term: string): Promise<PublicProfile[]> {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  const q = query(
    collection(db, COLLECTION),
    where("usernameLower", ">=", t),
    where("usernameLower", "<=", t + "\uf8ff"),
    fsLimit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PublicProfile);
}

// Resolve @username -> uid/perfil, pra abrir /u/$username.
export async function getPublicProfileByUsername(username: string): Promise<PublicProfile | null> {
  const t = username.trim().toLowerCase();
  const q = query(collection(db, COLLECTION), where("usernameLower", "==", t), fsLimit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as PublicProfile);
}

export async function reportProfile(targetUid: string, targetUsername: string, reason: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  if (uid === targetUid) throw new Error("Você não pode denunciar seu próprio perfil.");
  await addDoc(collection(db, "reports"), {
    reporterUid: uid,
    targetUid,
    targetUsername,
    reason: reason.trim().slice(0, 500),
    status: "pending",
    createdAt: Date.now(),
  });
}

// Salva só o resumo do gosto (contagens de tipo/gênero, sem títulos) no
// perfil público — é o que alimenta a sugestão de amigos por afinidade.
export async function syncTasteProfile(uid: string, tasteProfile: TasteProfile): Promise<void> {
  await setDoc(doc(db, COLLECTION, uid), stripUndefined({ tasteProfile }), { merge: true });
}

// Busca um lote de perfis públicos que já têm perfil de gosto calculado,
// pra servir de candidatos na tela de sugestões de amizade.
export async function getSuggestionCandidates(limitCount = 60): Promise<PublicProfile[]> {
  const q = query(
    collection(db, COLLECTION),
    where("tasteProfile.totalWorks", ">", 0),
    fsLimit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PublicProfile);
}

// Busca vários perfis públicos de uma vez, pelo uid — usado no ranking de
// amigos em /stats. Firestore limita "in" a 10 itens por consulta, então
// quebramos em lotes.
export async function getPublicProfilesByUids(uids: string[]): Promise<PublicProfile[]> {
  if (uids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 10) {
    chunks.push(uids.slice(i, i + 10));
  }
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, COLLECTION), where(documentId(), "in", chunk));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as PublicProfile);
    }),
  );
  return results.flat();
}