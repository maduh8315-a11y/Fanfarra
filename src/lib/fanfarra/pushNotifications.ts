// src/lib/fanfarra/pushNotifications.ts
import { Capacitor } from "@capacitor/core";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, firebaseApp } from "./firebase";

type PushResult = "granted" | "denied" | "unsupported" | "error";

async function saveTokenToFirestore(token: string, platform: "web" | "android") {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(doc(db, "push_tokens", token), {
    uid,
    token,
    platform,
    updatedAt: Date.now(),
  });
}

// ── Web / PWA ────────────────────────────────────────────────────────────
async function enableWebPush(): Promise<PushResult> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return "error";
    await saveTokenToFirestore(token, "web");
    return "granted";
  } catch (err) {
    console.error("[push] falha ao obter token web:", err);
    return "error";
  }
}

// ── Android nativo (Capacitor) ──────────────────────────────────────────
async function enableNativePush(): Promise<PushResult> {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return "denied";

  return new Promise((resolve) => {
    PushNotifications.addListener("registration", (token) => {
      saveTokenToFirestore(token.value, "android").then(() => resolve("granted"));
    });
    PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] falha ao registrar token nativo:", err);
      resolve("error");
    });
    PushNotifications.register();
  });
}

// ── API pública ──────────────────────────────────────────────────────────
export async function enablePushNotifications(): Promise<PushResult> {
  return Capacitor.isNativePlatform() ? enableNativePush() : enableWebPush();
}

// Mostra um toast quando chega push com o app ABERTO (web).
// No Android nativo isso é tratado pelo próprio sistema operacional.
export function listenForegroundPush(onReceive: (title: string, body: string) => void) {
  if (typeof window === "undefined" || Capacitor.isNativePlatform()) return () => {};

  let unsubscribe = () => {};
  isSupported().then((supported) => {
    if (!supported) return;
    const messaging = getMessaging(firebaseApp);
    unsubscribe = onMessage(messaging, (payload) => {
      onReceive(payload.notification?.title ?? "Fanfarra", payload.notification?.body ?? "");
    });
  });
  return () => unsubscribe();
}