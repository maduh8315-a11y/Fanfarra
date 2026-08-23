// src/lib/fanfarra/analytics.ts
import { Capacitor } from "@capacitor/core";
import { firebaseApp } from "./firebase";

// Analytics de PRODUTO (funil, uso de features) — não confundir com o
// Sentry, que só cuida de erros técnicos. Funciona tanto no app nativo
// (Android/iOS, via Firebase Analytics nativo) quanto no navegador (via
// Firebase Analytics Web). Em SSR não faz nada, já que não existe ninguém
// navegando ainda nesse momento.

let webAnalytics: unknown | null = null;
let webAnalyticsChecked = false;

async function getWebAnalytics() {
  if (webAnalyticsChecked) return webAnalytics;
  webAnalyticsChecked = true;
  if (typeof window === "undefined") return null; // SSR
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported();
    if (!supported) return null; // navegador sem suporte (ex: alguns modos privados)
    webAnalytics = getAnalytics(firebaseApp);
  } catch (err) {
    console.error("Erro ao iniciar analytics web:", err);
  }
  return webAnalytics;
}

export async function logEvent(name: string, params?: Record<string, string | number>) {
  try {
    if (Capacitor.isNativePlatform()) {
      const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics");
      await FirebaseAnalytics.logEvent({ name, params });
      return;
    }
    const analytics = await getWebAnalytics();
    if (!analytics) return;
    const { logEvent: fbLogEvent } = await import("firebase/analytics");
    fbLogEvent(analytics as Parameters<typeof fbLogEvent>[0], name, params);
  } catch (err) {
    console.error("Erro ao registrar evento de analytics:", err);
  }
}