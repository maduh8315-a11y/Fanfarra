// Espelho público do perfil — só os campos que podem ficar visíveis pra
// qualquer usuário logado (sem e-mail). Alimenta a busca de pessoas e as
// telas de amigo/perfil público.
import {
  addDoc,
  collection,
  doc,
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