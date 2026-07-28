import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit as fsLimit,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { checkClientCooldown } from "./clientCooldown";
import { notifyMany } from "./notify";

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";
const MESSAGES_PAGE = 100;

export function chatIdFor(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderUsername: string;
  text: string;
  createdAt: number;
}

export interface ChatSummary {
  id: string;
  members: string[];
  otherUid: string;
  lastMessage?: string;
  lastMessageAt?: number;
  lastSenderUid?: string;
  unread: boolean;
}

function useUid(): string | null {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);
  return uid;
}

export function useChatList(): ChatSummary[] {
  const uid = useUid();
  const [list, setList] = useState<ChatSummary[]>([]);
  useEffect(() => {
    setList([]);
    if (!uid) return;
    const q = query(collection(db, CHATS_COLLECTION), where("members", "array-contains", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as any;
          const otherUid = (data.members as string[]).find((m) => m !== uid) ?? "";
          const readAt = data.readAt?.[uid] ?? 0;
          return {
            id: d.id,
            members: data.members,
            otherUid,
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt,
            lastSenderUid: data.lastSenderUid,
            unread: !!data.lastMessageAt && data.lastSenderUid !== uid && data.lastMessageAt > readAt,
          } as ChatSummary;
        });
        rows.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
        setList(rows);
      },
      (err) => console.error("Erro ao sincronizar conversas:", err),
    );
    return () => unsub();
  }, [uid]);
  return list;
}

export function useUnreadChatsCount(): number {
  return useChatList().filter((c) => c.unread).length;
}

export function useChatMessages(chatId: string): ChatMessage[] {
  const [list, setList] = useState<ChatMessage[]>([]);
  useEffect(() => {
    setList([]);
    if (!chatId) return;
    const q = query(
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
      orderBy("createdAt", "desc"),
      fsLimit(MESSAGES_PAGE),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }));
        rows.sort((a, b) => a.createdAt - b.createdAt);
        setList(rows);
      },
      (err) => console.error("Erro ao sincronizar mensagens:", err),
    );
    return () => unsub();
  }, [chatId]);
  return list;
}

// Cria a conversa (se ainda não existir) e envia a mensagem. Só funciona se
// já existir um documento em "friendships" pros dois — ver firestore.rules.
export async function sendChatMessage(
  otherUid: string,
  otherUsername: string,
  myUsername: string,
  text: string,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Você precisa estar logado.");
  const trimmed = text.trim();
  if (!trimmed) return;
  checkClientCooldown(`chat-send:${uid}`, 400);

  const chatId = chatIdFor(uid, otherUid);
  const now = Date.now();

  await setDoc(
    doc(db, CHATS_COLLECTION, chatId),
    {
      members: [uid, otherUid].sort(),
      lastMessage: trimmed,
      lastMessageAt: now,
      lastSenderUid: uid,
      readAt: { [uid]: now },
    },
    { merge: true },
  );

  await addDoc(collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION), {
    senderUid: uid,
    senderUsername: myUsername,
    text: trimmed,
    createdAt: now,
  });

  const preview = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  await notifyMany([otherUid], "message-circle", `${myUsername}: ${preview}`);
}


export async function markChatRead(chatId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !chatId) return;
  await updateDoc(doc(db, CHATS_COLLECTION, chatId), { [`readAt.${uid}`]: Date.now() }).catch(() => {});
}