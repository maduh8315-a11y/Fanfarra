// Integração com RevenueCat (Google Play Billing por baixo).
// Só funciona dentro do app Android de verdade — no navegador (mesmo
// testando local) o SDK nativo não existe, então tudo aqui vira no-op.
import { Capacitor } from "@capacitor/core";

export const PRO_ENTITLEMENT_ID = "pro";

export function isNativePurchasesAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

let configured = false;

export async function initPurchases(uid: string) {
  if (!isNativePurchasesAvailable()) return;
  const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
  if (!configured) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey: import.meta.env.VITE_REVENUECAT_API_KEY_ANDROID,
      appUserID: uid, // usa o UID do Firebase — assim o webhook casa direto com o Firestore
    });
    configured = true;
  } else {
    await Purchases.logIn({ appUserID: uid });
  }
}

export async function logOutPurchases() {
  if (!isNativePurchasesAvailable() || !configured) return;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  await Purchases.logOut();
}

export async function getProOfferings() {
  if (!isNativePurchasesAvailable()) return null;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  return offerings.current; // .monthly / .annual — confira os nomes reais no log se der erro
}

export async function purchaseProPackage(pkg: any) {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return !!customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
}

export async function restorePurchases(): Promise<boolean> {
  if (!isNativePurchasesAvailable()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.restorePurchases();
  return !!customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
}