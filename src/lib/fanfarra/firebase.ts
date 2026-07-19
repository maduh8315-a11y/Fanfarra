import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// evita reinicializar o app em hot-reload do dev server
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

// No servidor (SSR) não existe IndexedDB, então usamos cache em memória lá
// e cache persistente (IndexedDB, com suporte a múltiplas abas) no browser.
// Isso faz o app conseguir mostrar dados já vistos mesmo sem internet, em vez
// de só ficar tentando reconectar e falhando.
// evita o mesmo problema de reinicialização em hot-reload do dev server:
// se o Firestore já foi inicializado pra esse app (ex: depois de um HMR),
// initializeFirestore() falha — nesse caso, só pegamos a instância existente.
let db: ReturnType<typeof initializeFirestore>;
try {
  db = initializeFirestore(firebaseApp, {
    localCache:
      typeof window === "undefined"
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  db = getFirestore(firebaseApp);
}
export { db };
