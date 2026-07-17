import { Capacitor } from "@capacitor/core";

// Registra o service worker só no navegador — nunca no app nativo (o
// Capacitor já empacota os arquivos localmente, então SW só atrapalharia
// lá) e nunca em desenvolvimento (o SW cacheia agressivamente e brigaria
// com o hot reload do Vite).
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (Capacitor.isNativePlatform()) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] Registrado com sucesso:", reg.scope);
      })
      .catch((err) => {
        console.error("[SW] Falha ao registrar:", err);
      });
  });
}