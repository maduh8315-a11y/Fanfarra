// src/lib/fanfarra/analytics.ts
import { Capacitor } from "@capacitor/core";

// Só registra evento em build nativa (Android/iOS) — no navegador ou no
// servidor (SSR) esse plugin nem existe, então a chamada quebraria sem essa
// checagem.
export async function logEvent(name: string, params?: Record<string, string | number>) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics");
    await FirebaseAnalytics.logEvent({ name, params });
  } catch (err) {
    console.error("Erro ao registrar evento de analytics:", err);
  }
}