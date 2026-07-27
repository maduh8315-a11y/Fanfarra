import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { stripUndefined } from "./firestoreUtils";
import { checkClientCooldown } from "./clientCooldown";
import { notifyMany } from "./notify";

const REQUESTS_COLLECTION = "friend_requests";
const FRIENDSHIPS_COLLECTION = "friendships";
const BLOCKS_COLLECTION = "blocks";

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromUsername: string;
  toUsername: string;
  fromAvatar?: string;
  toAvatar?: string;
  status: FriendRequestStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Friendship {
  id: string;
  members: string[];
  friendUid: string;
  createdAt: number;
}

function pairId(a: string, b: string) {
  return [a, b].sort().join("_");
}

function useUid(): string | null {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);
  return uid;
}

export function useIncomingFriendRequests(): FriendRequest[] {
  const uid = useUid();
  const [list, setList] = useState<FriendRequest[]>([]);
  useEffect(() => {
    setList([]);
    if (!uid) return;
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where("toUid", "==", uid),
      where("status", "==", "pending"),
    );
    const unsub = onSnapshot(
      q,
      (snap) =>
        setList(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, "id">) }))
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      (err) => console.error("Erro ao sincronizar pedidos recebidos:", err),
    );
    return () => unsub();
  }, [uid]);
  return list;
}

export function useOutgoingFriendRequests(): FriendRequest[] {
  const uid = useUid();
  const [list, setList] = useState<FriendRequest[]>([]);
  useEffect(() => {
    setList([]);
    if (!uid) return;
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where("fromUid", "==", uid),
      where("status", "==", "pending"),
    );
    const unsub = onSnapshot(
      q,
      (snap) =>
        setList(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, "id">) }))
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      (err) => console.error("Erro ao sincronizar pedidos enviados:", err),
    );
    return () => unsub();
  }, [uid]);
  return list;
}

export function useFriends(): Friendship[] {
  const uid = useUid();
  const [list, setList] = useState<Friendship[]>([]);
  useEffect(() => {
    setList([]);
    if (!uid) return;
    const q = query(collection(db, FRIENDSHIPS_COLLECTION), where("members", "array-contains", uid));
    const unsub = onSnapshot(
      q,
      (snap) =>
        setList(
          snap.docs
            .map((d) => {
              const data = d.data() as { members: string[]; createdAt: number };
              const friendUid = data.members.find((m) => m !== uid) ?? data.members[0];
              return { id: d.id, members: data.members, friendUid, createdAt: data.createdAt };
            })
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      (err) => console.error("Erro ao sincronizar amigos:", err),
    );
    return () => unsub();
  }, [uid]);
  return list;
}

export function useIsFriend(otherUid: string | undefined): boolean {
  const friends = useFriends();
  if (!otherUid) return false;
  return friends.some((f) => f.friendUid === otherUid);
}

export async function sendFriendRequest(
  toUid: string,
  toUsername: string,
  toAvatar: string | undefined,
  myUsername: string,
  myAvatar?: string,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  if (uid === toUid) throw new Error("Você não pode adicionar a si mesmo.");
 checkClientCooldown(`friend-request:${uid}:${toUid}`, 2_000);

  const [blockedByMe, blockedMe] = await Promise.all([
    getDoc(doc(db, BLOCKS_COLLECTION, `${uid}_${toUid}`)),
    getDoc(doc(db, BLOCKS_COLLECTION, `${toUid}_${uid}`)),
  ]);
  if (blockedByMe.exists() || blockedMe.exists()) {
    throw new Error("Não é possível enviar pedido de amizade para este usuário.");
  }

  // se a outra pessoa já te chamou primeiro, aceita direto em vez de duplicar
  const reverseId = `${toUid}_${uid}`;
  const reverseSnap = await getDoc(doc(db, REQUESTS_COLLECTION, reverseId));
  if (reverseSnap.exists() && (reverseSnap.data() as FriendRequest).status === "pending") {
    await acceptFriendRequest(reverseId, reverseSnap.data() as FriendRequest, myUsername, myAvatar);
    return;
  }

  const id = `${uid}_${toUid}`;
  const now = Date.now();
  await setDoc(
    doc(db, REQUESTS_COLLECTION, id),
    stripUndefined({
      fromUid: uid,
      toUid,
      fromUsername: myUsername,
      toUsername,
      fromAvatar: myAvatar,
      toAvatar,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }),
  );
  await notifyMany([toUid], "user-plus", `${myUsername} te enviou um pedido de amizade.`);
}

export async function acceptFriendRequest(
  requestId: string,
  request: Pick<FriendRequest, "fromUid" | "toUid">,
  myUsername: string,
  myAvatar?: string,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  const otherUid = request.fromUid === uid ? request.toUid : request.fromUid;

  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), { status: "accepted", updatedAt: Date.now() });
  await setDoc(doc(db, FRIENDSHIPS_COLLECTION, pairId(uid, otherUid)), {
    members: [uid, otherUid].sort(),
    createdAt: Date.now(),
  });
  await notifyMany([otherUid], "users", `${myUsername} aceitou seu pedido de amizade! Agora vocês são amigos.`);
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), { status: "declined", updatedAt: Date.now() });
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, REQUESTS_COLLECTION, requestId));
}

export async function removeFriend(friendUid: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  await deleteDoc(doc(db, FRIENDSHIPS_COLLECTION, pairId(uid, friendUid)));
}

export async function blockUser(blockedUid: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  if (uid === blockedUid) throw new Error("Você não pode bloquear a si mesmo.");

  await setDoc(doc(db, BLOCKS_COLLECTION, `${uid}_${blockedUid}`), {
    blockerUid: uid,
    blockedUid,
    createdAt: Date.now(),
  });

  // remove amizade e pedidos pendentes entre os dois, em qualquer direção
  await Promise.allSettled([
    deleteDoc(doc(db, FRIENDSHIPS_COLLECTION, pairId(uid, blockedUid))),
    deleteDoc(doc(db, REQUESTS_COLLECTION, `${uid}_${blockedUid}`)),
    deleteDoc(doc(db, REQUESTS_COLLECTION, `${blockedUid}_${uid}`)),
  ]);
}

export async function unblockUser(blockedUid: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  await deleteDoc(doc(db, BLOCKS_COLLECTION, `${uid}_${blockedUid}`));
}

// true se EU bloqueei essa pessoa
export function useIsBlockedByMe(otherUid: string | undefined): boolean {
  const uid = useUid();
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    setBlocked(false);
    if (!uid || !otherUid) return;
    const unsub = onSnapshot(
      doc(db, BLOCKS_COLLECTION, `${uid}_${otherUid}`),
      (snap) => setBlocked(snap.exists()),
      (err) => console.error("Erro ao verificar bloqueio:", err),
    );
    return () => unsub();
  }, [uid, otherUid]);
  return blocked;
}

// true se essa pessoa ME bloqueou
export function useAmIBlockedBy(otherUid: string | undefined): boolean {
  const uid = useUid();
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    setBlocked(false);
    if (!uid || !otherUid) return;
    const unsub = onSnapshot(
      doc(db, BLOCKS_COLLECTION, `${otherUid}_${uid}`),
      (snap) => setBlocked(snap.exists()),
      (err) => console.error("Erro ao verificar bloqueio:", err),
    );
    return () => unsub();
  }, [uid, otherUid]);
  return blocked;
}

// lista de uids que EU bloqueei — usada pra esconder da busca
export function useBlockedByMe(): string[] {
  const uid = useUid();
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    setList([]);
    if (!uid) return;
    const q = query(collection(db, BLOCKS_COLLECTION), where("blockerUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => setList(snap.docs.map((d) => (d.data() as { blockedUid: string }).blockedUid)),
      (err) => console.error("Erro ao sincronizar bloqueios:", err),
    );
    return () => unsub();
  }, [uid]);
  return list;
}