import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { generateId } from "./uuid";

const GOALS_COLLECTION = "personal_goals";

export interface Goal {
  id: string;
  uid: string;
  title: string;
  target: number;
  progress: number;
  emoji: string;
  createdAt: number;
}

function useUid(): string | null {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);
  return uid;
}

export function useGoals(): Goal[] {
  const uid = useUid();
  const [list, setList] = useState<Goal[]>([]);
  useEffect(() => {
    setList([]);
    if (!uid) return;
    const q = query(collection(db, GOALS_COLLECTION), where("uid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const goals = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Goal, "id">) }));
        goals.sort((a, b) => b.createdAt - a.createdAt);
        setList(goals);
      },
      (err) => console.error("Erro ao sincronizar metas pessoais:", err),
    );
    return () => unsub();
  }, [uid]);
  return list;
}

export async function addGoal(title: string, target: number, emoji: string = "🎯"): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Escreva um título pra meta.");
  if (!target || target <= 0) throw new Error("A meta precisa ser maior que zero.");

  const id = generateId();
  await setDoc(doc(db, GOALS_COLLECTION, id), {
    uid,
    title: cleanTitle,
    target,
    progress: 0,
    emoji,
    createdAt: Date.now(),
  });
}

export async function updateGoalProgress(id: string, progress: number): Promise<void> {
  await updateDoc(doc(db, GOALS_COLLECTION, id), {
    progress: Math.max(0, progress),
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await deleteDoc(doc(db, GOALS_COLLECTION, id));
}