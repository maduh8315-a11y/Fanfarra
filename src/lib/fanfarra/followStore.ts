import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { checkClientCooldown } from "./clientCooldown";
import { notifyMany } from "./notify";

const FOLLOWS_COLLECTION = "follows";

export interface Follow {
  id: string;
  followerUid: string;
  followingUid: string;
  followerUsername: string;
  followingUsername: string;
  createdAt: number;
}

function followId(followerUid: string, followingUid: string) {
  return `${followerUid}_${followingUid}`;
}

function useUid(): string | null {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);
  return uid;
}

// Pessoas que EU sigo
export function useFollowing(): Follow[] {
  const uid = useUid();
  const [list, setList] = useState<Follow[]>([]);
  useEffect(() => {
    setList([]);
    if (!uid) return;
    const q = query(collection(db, FOLLOWS_COLLECTION), where("followerUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, "id">) }))),
      (err) => console.error("Erro ao sincronizar quem você segue:", err),
    );
    return () => unsub();
  }, [uid]);
  return list;
}

// Quem me segue
export function useFollowers(): Follow[] {
  const uid = useUid();
  const [list, setList] = useState<Follow[]>([]);
  useEffect(() => {
    setList([]);
    if (!uid) return;
    const q = query(collection(db, FOLLOWS_COLLECTION), where("followingUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, "id">) }))),
      (err) => console.error("Erro ao sincronizar seguidores:", err),
    );
    return () => unsub();
  }, [uid]);
  return list;
}

export function useIsFollowing(targetUid: string | undefined): boolean {
  const following = useFollowing();
  if (!targetUid) return false;
  return following.some((f) => f.followingUid === targetUid);
}

export async function followUser(targetUid: string, targetUsername: string, myUsername: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  if (uid === targetUid) throw new Error("Você não pode seguir a si mesmo.");
  checkClientCooldown(`follow:${uid}:${targetUid}`, 1_000);

  await setDoc(doc(db, FOLLOWS_COLLECTION, followId(uid, targetUid)), {
    followerUid: uid,
    followingUid: targetUid,
    followerUsername: myUsername,
    followingUsername: targetUsername,
    createdAt: Date.now(),
  });
  await notifyMany([targetUid], "eye", `${myUsername} começou a seguir você.`);
}

export async function unfollowUser(targetUid: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  await deleteDoc(doc(db, FOLLOWS_COLLECTION, followId(uid, targetUid)));
}