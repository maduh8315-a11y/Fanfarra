import { useEffect, useState, useSyncExternalStore } from "react";
import { arrayUnion, collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

// ===== Histórico de premiações — "essa obra já foi vencedora antes" =====
//
// Guarda, por obra (identificada pelo título normalizado), a lista de
// prêmios/anos que ela já ganhou em qualquer edição do Fanfarra Awards.
// Diferente de awards_catalog (que é zerado a cada nova edição), essa
// coleção é permanente: cada vitória só é ADICIONADA, nunca apagada.

const HISTORY_COLLECTION = "awards_history";

export interface AwardWinEntry {
  year: number;
  categoryId: string;
  categoryName: string;
  emoji: string;
}

interface AwardHistoryDoc {
  title: string;
  wins: AwardWinEntry[];
}

// Normaliza o título pra usar como ID de documento e pra comparar a mesma
// obra em telas diferentes (biblioteca, recomendação da comunidade,
// indicado do Awards) mesmo com pequenas diferenças de acento/espaço/caixa.
export function normalizeAwardTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

let historyCache = new Map<string, AwardHistoryDoc>();
const listeners = new Set<() => void>();
let unsub: (() => void) | null = null;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

function connect() {
  if (unsub) return;

  const tryConnect = () => {
    if (unsub || !auth.currentUser) return;
    unsub = onSnapshot(
      collection(db, HISTORY_COLLECTION),
      (snap) => {
        const next = new Map<string, AwardHistoryDoc>();
        snap.docs.forEach((d) => next.set(d.id, d.data() as AwardHistoryDoc));
        historyCache = next;
        notify();
      },
      (err) => {
        console.error("Erro ao carregar histórico de premiações:", err);
        unsub = null; // libera pra tentar de novo assim que o login terminar
      },
    );
  };

  tryConnect();
  onAuthStateChanged(auth, () => tryConnect());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
  if (listeners.size === 1) connect();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      disconnectTimer = setTimeout(() => {
        unsub?.();
        unsub = null;
      }, 15_000);
    }
  };
}

const EMPTY_WINS: AwardWinEntry[] = [];

// Hook: devolve todos os prêmios que uma obra (pelo título) já ganhou em
// qualquer edição, do mais recente pro mais antigo. [] se nunca ganhou nada.
export function useAwardWins(title: string | undefined | null): AwardWinEntry[] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const key = title ? normalizeAwardTitle(title) : "";
  const data = useSyncExternalStore(
    subscribe,
    () => (key ? (historyCache.get(key)?.wins ?? EMPTY_WINS) : EMPTY_WINS),
    () => EMPTY_WINS,
  );
  if (!mounted || !key) return EMPTY_WINS;
  return data.length > 1 ? [...data].sort((a, b) => b.year - a.year) : data;
}

// Grava (soma) uma vitória no histórico de uma obra. Chamada só pelo motor
// automático do Awards, na virada de fase "final" → "resultado".
export async function recordAwardWin(title: string, entry: AwardWinEntry): Promise<void> {
  const id = normalizeAwardTitle(title);
  if (!id) return;
  await setDoc(doc(db, HISTORY_COLLECTION, id), { title, wins: arrayUnion(entry) }, { merge: true });
}