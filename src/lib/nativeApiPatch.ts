import { Capacitor } from "@capacitor/core";

// URL pública do backend publicado na Cloudflare.
// Só é usada dentro do app Android instalado — no navegador (dev local ou
// o link da Cloudflare) nada muda, pois lá o app e o backend já estão no
// mesmo domínio.
const BACKEND_URL = "https://fanfarra-backend.fanfarra.workers.dev";

export function patchServerFnBaseUrl() {
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return; // só ativa dentro do app instalado

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.startsWith("/_serverFn/")) {
      return originalFetch(BACKEND_URL + url, init);
    }

    return originalFetch(input, init);
  };

  console.log("[nativeApiPatch] Chamadas de servidor redirecionadas para", BACKEND_URL);
}