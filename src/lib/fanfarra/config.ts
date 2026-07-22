import { useState, useEffect } from "react";
import { useSettings } from "./extras";

// Ativa atalhos de teste (botão pra ligar/desligar o PRO manualmente, sem
// precisar comprar de verdade). Serve pra você testar as telas.
// IMPORTANTE: mude para `false` antes de publicar a versão final do app —
// caso contrário, qualquer pessoa vê o botão de "ativar PRO de teste".
export const DEV_MODE = true;

// Fonte única da verdade sobre o status PRO do usuário.
// A partir de agora, SEMPRE use este hook pra checar se algo é PRO —
// nunca leia `settings.pro` direto em outro lugar do app.
export function useIsPro(): boolean {
  const settings = useSettings();
  return settings.pro;
}

// Fonte única da verdade para o(s) UID(s) de administrador do app.
// NÃO é mais hardcoded aqui — vive no documento app_config/admins no
// Firestore. O firestore.rules lê o MESMO documento via get(), então
// para adicionar/remover um admin basta editar esse doc no Console:
// não há nada para sincronizar manualmente nem reimplantar.
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

let cachedAdminUids: string[] | null = null;

function useAdminUids(): string[] {
  const [uids, setUids] = useState<string[]>(cachedAdminUids ?? []);
  useEffect(() => {
    const ref = doc(db, "app_config", "admins");
    const unsub = onSnapshot(ref, (snap) => {
      const list = (snap.data()?.uids as string[]) ?? [];
      cachedAdminUids = list;
      setUids(list);
    });
    return unsub;
  }, []);
  return uids;
}

// Use isso em COMPONENTES React no lugar de ADMIN_UIDS.includes(uid).
export function useIsAdmin(uid: string | undefined | null): boolean {
  const adminUids = useAdminUids();
  return !!uid && adminUids.includes(uid);
}

// Use isso FORA de componentes React (ex.: funções utilitárias soltas).
export async function isAdminUid(uid: string): Promise<boolean> {
  if (cachedAdminUids) return cachedAdminUids.includes(uid);
  const snap = await getDoc(doc(db, "app_config", "admins"));
  const list = (snap.data()?.uids as string[]) ?? [];
  cachedAdminUids = list;
  return list.includes(uid);
}