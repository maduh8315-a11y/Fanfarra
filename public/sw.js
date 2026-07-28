// sw.js — Service Worker do Fanfarra
//
// Estratégias de cache:
//  • Navegação entre páginas (HTML): network-first — tenta a rede pra sempre
//    trazer conteúdo fresco; se estiver offline, cai pro cache e, se a página
//    nunca foi visitada, mostra /offline.html.
//  • Assets estáticos same-origin (js, css, imagem, fonte): stale-while-
//    revalidate — responde na hora com o que já está em cache (se existir) e
//    atualiza o cache em segundo plano.
//  • Qualquer requisição que não seja GET, ou que seja pra outro domínio
//    (Firebase, Google Fonts, o backend da Cloudflare, etc.), passa direto —
//    o service worker nunca intercepta essas chamadas.
//
// Bump a versão abaixo sempre que quiser forçar os clientes a jogarem fora
// o cache antigo (ex: depois de um deploy com mudanças grandes de assets).

// ── Firebase Cloud Messaging (push em segundo plano) ───────────────────────
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA7D91hIRP5PjxIUl8Pfyy4IJFsdrW1wYY",
  authDomain: "fanfarra-6e54b.firebaseapp.com",
  projectId: "fanfarra-6e54b",
  storageBucket: "fanfarra-6e54b.firebasestorage.app",
  messagingSenderId: "514080981795",
  appId: "1:514080981795:web:b23741870bb5f636194296",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Fanfarra";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.data?.url || "/notifications" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notifications";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
// ── fim do bloco FCM ─────────────────────────────────────────────────────

const CACHE_VERSION = "fanfarra-v3"; // ← subi de v2 pra v3 pra forçar clientes antigos a atualizar
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

// Só arquivos de /public com nome fixo (não passam por hash no build).
const PRECACHE_URLS = [
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("fanfarra-") && key !== STATIC_CACHE && key !== PAGES_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && (request.headers.get("accept") || "").includes("text/html"))
  );
}

// NOVO: busca na rede com prazo máximo. Se a rede não responder a tempo,
// desiste e deixa o .catch() de quem chamou decidir o que fazer (cache ou
// offline.html) — em vez de ficar esperando pra sempre.
function fetchWithTimeout(request, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("sw-fetch-timeout")), timeoutMs);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return; // nunca intercepta POST/PUT (server functions, uploads, etc.)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // não mexe em Firebase, Google Fonts, backend externo etc.

  // Navegação entre páginas
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetchWithTimeout(request, 8000)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match("/offline.html"));
        }),
    );
    return;
  }

  // Assets estáticos
  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetchWithTimeout(request, 8000)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});