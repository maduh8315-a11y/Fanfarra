// Comentários da comunidade em obras da tela de Recomendações (rec/$id).
// Mesmo padrão do rec_reactions: qualquer usuário logado pode comentar,
// e só o dono do comentário (ou um admin) pode apagar.
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { checkClientCooldown } from "./clientCooldown";
import { ADMIN_UIDS } from "./config";

const COMMENTS_COLLECTION = "rec_comments";


export interface RecComment {
  id: string;
  itemId: string;
  uid: string;
  username: string;
  text: string;
  createdAt: number;
}

// ── Comentários de um item, em tempo real (mais antigos primeiro) ──────────
export function useRecComments(itemId: string): RecComment[] {
  const [comments, setComments] = useState<RecComment[]>([]);

  useEffect(() => {
    setComments([]);
    if (!itemId) return;
    const q = query(collection(db, COMMENTS_COLLECTION), where("itemId", "==", itemId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RecComment, "id">) }));
        list.sort((a, b) => a.createdAt - b.createdAt);
        setComments(list);
      },
      (err) => console.error("Erro ao sincronizar comentários:", err),
    );
    return () => unsub();
  }, [itemId]);

  return comments;
}

// ── Postar um comentário ────────────────────────────────────────────────────
export async function postRecComment(itemId: string, username: string, text: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado para comentar.");
  checkClientCooldown(`rec-comment:${uid}`, 3_000);
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Escreva algo antes de enviar.");

  await addDoc(collection(db, COMMENTS_COLLECTION), {
    itemId,
    uid,
    username,
    text: trimmed,
    createdAt: Date.now(),
  });
}

// ── Apagar um comentário (dono ou admin) ────────────────────────────────────
export async function deleteRecComment(commentId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado para apagar.");

  const ref = doc(db, COMMENTS_COLLECTION, commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const ownerUid = (snap.data() as { uid?: string }).uid;
  if (ownerUid !== uid && !ADMIN_UIDS.includes(uid)) {
    throw new Error("Você não pode apagar este comentário.");
  }
  await deleteDoc(ref);
}

/*
 * ── Regras OBRIGATÓRIAS no Firebase Console → Firestore → Regras
 * (e também replique em firestore.rules na raiz do projeto):
 *
 * match /rec_comments/{id} {
 *   allow read: if request.auth != null;
 *   allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
 *   allow delete: if request.auth != null &&
 *     (request.auth.uid == resource.data.uid || request.auth.uid == "ikvASYa9kgQknCrZeiiupirGGef1");
 * }
 */