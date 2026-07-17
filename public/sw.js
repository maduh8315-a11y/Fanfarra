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
const CACHE_VERSION = "fanfarra-v2";
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

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return; // nunca intercepta POST/PUT (server functions, uploads, etc.)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // não mexe em Firebase, Google Fonts, backend externo etc.

  // Navegação entre páginas
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
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
        const network = fetch(request)
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