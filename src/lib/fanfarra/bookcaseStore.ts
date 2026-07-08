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
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { generateId } from "./uuid";
import type { MediaType, Status } from "./types";
import { stripUndefined } from "./firestoreUtils.ts";

const COLLECTION = "bookcases";

export interface ShelfRule {
  mediaTypes?: MediaType[];
  fandoms?: string[];
  statuses?: Status[];
  minRating?: number;
}

export type ShelfSortOrder =
  | "manual"
  | "title_asc"
  | "title_desc"
  | "rating_desc"
  | "rating_asc"
  | "updated_desc"
  | "updated_asc";

export interface Shelf {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  cover?: string;
  accent?: string;
  tags?: string[];
  sortOrder?: ShelfSortOrder;
  mode: "manual" | "auto";
  rules?: ShelfRule;
  workIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Bookcase {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  cover?: string;
  accent?: string;
  isPublic: boolean;
  shelves: Shelf[];
  createdAt: number;
  updatedAt: number;
}

let cache: Bookcase[] = [];
let unsubscribeSnapshot: (() => void) | null = null;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: Bookcase[] = [];

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
      cache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bookcase, "id">) }));
      notify();
    },
    (err) => console.error("Erro ao sincronizar estantes:", err),
  );
});

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useBookcases(): Bookcase[] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(
    subscribe,
    () => cache,
    () => SERVER_SNAPSHOT,
  );
  return mounted ? data : SERVER_SNAPSHOT;
}

export function useBookcase(id: string): Bookcase | undefined {
  return useBookcases().find((b) => b.id === id);
}

export function addBookcase(data: Omit<Bookcase, "id" | "createdAt" | "updatedAt">): Bookcase {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado para criar uma estante.");
  const now = Date.now();
  const ref = doc(collection(db, COLLECTION));
  const bc: Bookcase = { ...data, id: ref.id, createdAt: now, updatedAt: now };

  // Atualização otimista: mostra a estante na tela imediatamente,
  // sem esperar a resposta do Firestore.
  cache = [bc, ...cache];
  notify();

  setDoc(ref, stripUndefined({ ...data, uid, createdAt: now, updatedAt: now })).catch((err) => {
    console.error("Erro ao salvar estante:", err);
    // Se a gravação falhar, desfaz a criação otimista.
    cache = cache.filter((b) => b.id !== bc.id);
    notify();
  });
  return bc;
}

export function updateBookcase(id: string, patch: Partial<Omit<Bookcase, "shelves">>): void {
  const { id: _omit, ...rest } = patch;
  updateDoc(doc(db, COLLECTION, id), stripUndefined({ ...rest, updatedAt: Date.now() })).catch(
    (err) => console.error("Erro ao atualizar estante:", err),
  );
}

export function deleteBookcase(id: string): void {
  const previous = cache;
  cache = cache.filter((b) => b.id !== id);
  notify();
  deleteDoc(doc(db, COLLECTION, id)).catch((err) => {
    console.error("Erro ao excluir estante:", err);
    cache = previous;
    notify();
  });
}

// ── operações em shelves (ficam embutidas dentro do documento da estante) ──

function cleanShelf(shelf: Shelf): Shelf {
  const clean = { ...shelf } as Record<string, unknown>;
  Object.keys(clean).forEach((key) => {
    if (clean[key] === undefined) delete clean[key];
  });
  return clean as unknown as Shelf;
}

function patchShelves(bookcaseId: string, nextShelves: Shelf[]): void {
  updateDoc(
    doc(db, COLLECTION, bookcaseId),
    stripUndefined({
      shelves: nextShelves,
      updatedAt: Date.now(),
    }),
  ).catch((err) => console.error("Erro ao atualizar prateleiras:", err));
}

function getBookcase(bookcaseId: string): Bookcase | undefined {
  return cache.find((b) => b.id === bookcaseId);
}

export function addShelf(
  bookcaseId: string,
  shelf: Omit<Shelf, "id" | "createdAt" | "updatedAt">,
): Shelf {
  const now = Date.now();
  const s: Shelf = { ...shelf, id: generateId(), createdAt: now, updatedAt: now };
  const bc = getBookcase(bookcaseId);
  if (bc) {
    const nextShelves = [...bc.shelves, s];
    cache = cache.map((b) => (b.id === bookcaseId ? { ...b, shelves: nextShelves } : b));
    notify();
    patchShelves(bookcaseId, nextShelves);
  }
  return s;
}

export function updateShelf(bookcaseId: string, shelfId: string, patch: Partial<Shelf>): void {
  const bc = getBookcase(bookcaseId);
  if (!bc) return;
  const now = Date.now();
  const nextShelves = bc.shelves.map((s) =>
    s.id === shelfId ? { ...s, ...patch, updatedAt: now } : s,
  );
  cache = cache.map((b) => (b.id === bookcaseId ? { ...b, shelves: nextShelves } : b));
  notify();
  patchShelves(bookcaseId, nextShelves);
}

export function deleteShelf(bookcaseId: string, shelfId: string): void {
  const bc = getBookcase(bookcaseId);
  if (!bc) return;
  const nextShelves = bc.shelves.filter((s) => s.id !== shelfId);
  cache = cache.map((b) => (b.id === bookcaseId ? { ...b, shelves: nextShelves } : b));
  notify();
  patchShelves(bookcaseId, nextShelves);
}

export function addWorkToShelf(bookcaseId: string, shelfId: string, workId: string): void {
  const bc = getBookcase(bookcaseId);
  if (!bc) return;
  patchShelves(
    bookcaseId,
    bc.shelves.map((s) =>
      s.id === shelfId && !s.workIds.includes(workId)
        ? { ...s, workIds: [...s.workIds, workId], updatedAt: Date.now() }
        : s,
    ),
  );
}

export function removeWorkFromShelf(bookcaseId: string, shelfId: string, workId: string): void {
  const bc = getBookcase(bookcaseId);
  if (!bc) return;
  patchShelves(
    bookcaseId,
    bc.shelves.map((s) =>
      s.id === shelfId
        ? { ...s, workIds: s.workIds.filter((id) => id !== workId), updatedAt: Date.now() }
        : s,
    ),
  );
}

export function getShelvesForWork(workId: string): { bookcaseId: string; shelfId: string }[] {
  const result: { bookcaseId: string; shelfId: string }[] = [];
  for (const bc of cache) {
    for (const shelf of bc.shelves) {
      if (shelf.workIds.includes(workId)) result.push({ bookcaseId: bc.id, shelfId: shelf.id });
    }
  }
  return result;
}

// mantido por compatibilidade — o cache agora é limpo automaticamente no
// listener de auth acima quando o usuário faz logout.
export function clearBookcasesCache(): void {
  cache = [];
  notify();
}
// Apaga todas as estantes do usuário no Firestore. Usada ao excluir a conta.
export async function deleteAllBookcasesForUser(uid: string): Promise<void> {
  const q = query(collection(db, COLLECTION), where("uid", "==", uid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
