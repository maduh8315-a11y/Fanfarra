import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useEffect, useState, useSyncExternalStore } from "react";
import { stripUndefined } from "./firestoreUtils.ts";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import type { Work } from "./types";

const COLLECTION = "works";

let cache: Work[] = [];
let unsubscribeSnapshot: (() => void) | null = null;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: Work[] = [];

function notify() {
  listeners.forEach((l) => l());
}

// escuta o login/logout uma única vez e (re)assina a coleção do Firestore
onAuthStateChanged(auth, (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  cache = [];
  notify();
  if (!user) return;

  const q = query(
    collection(db, COLLECTION),
    where("uid", "==", user.uid),
    orderBy("createdAt", "desc"),
  );
  unsubscribeSnapshot = onSnapshot(
    q,
    (snap) => {
      cache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Work, "id">) }));
      notify();
    },
    (err) => console.error("Erro ao sincronizar obras:", err),
  );
});

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useWorks(): Work[] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(
    subscribe,
    () => cache,
    () => SERVER_SNAPSHOT,
  );
  return mounted ? data : SERVER_SNAPSHOT;
}

export function useWork(id: string): Work | undefined {
  return useWorks().find((w) => w.id === id);
}

export function addWork(w: Omit<Work, "id" | "createdAt" | "updatedAt">): Work {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado.");
  const now = Date.now();
  const ref = doc(collection(db, COLLECTION));
  const work: Work = { ...w, id: ref.id, createdAt: now, updatedAt: now };
  setDoc(ref, stripUndefined({ ...w, uid, createdAt: now, updatedAt: now })).catch((err) =>
    console.error("Erro ao salvar obra:", err),
  );
  return work;
}

export function updateWork(id: string, patch: Partial<Work>): void {
  const { id: _omit, ...rest } = patch;
  updateDoc(doc(db, COLLECTION, id), stripUndefined({ ...rest, updatedAt: Date.now() })).catch(
    (err) => console.error("Erro ao atualizar obra:", err),
  );
}

export function deleteWork(id: string): void {
  deleteDoc(doc(db, COLLECTION, id)).catch((err) => console.error("Erro ao excluir obra:", err));
}

// Apaga todas as obras do usuário no Firestore. Usada ao excluir a conta.
export async function deleteAllWorksForUser(uid: string): Promise<void> {
  const q = query(collection(db, COLLECTION), where("uid", "==", uid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
