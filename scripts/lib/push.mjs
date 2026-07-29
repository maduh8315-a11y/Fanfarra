// scripts/lib/push.mjs
// Compartilhado entre scripts/cron.mjs (Awards) e scripts/checkEpisodes.mjs
// (episódios/capítulos novos) — o envio de push real (FCM) não pode ficar
// preso a só um dos dois, senão as notificações do outro ficam paradas.
import { getMessaging } from "firebase-admin/messaging";

export function pushAllowedForIcon(icon, settings) {
  if (["pause-circle", "calendar-clock"].includes(icon)) return settings.notif_paused !== false;
  if (["award", "vote", "bar-chart", "check-circle"].includes(icon)) return settings.notif_events !== false;
  if (icon === "play-circle") return settings.notif_episodes !== false;
  return true;
}

export async function sendPendingPushNotifications(db) {
  const pendingSnap = await db.collection("notifications").where("pushed", "==", false).limit(200).get();
  if (pendingSnap.empty) return console.log("[push] nada pendente.");

  const byUid = new Map();
  pendingSnap.docs.forEach((d) => {
    const data = d.data();
    if (!byUid.has(data.uid)) byUid.set(data.uid, []);
    byUid.get(data.uid).push({ ref: d.ref, ...data });
  });

  const messaging = getMessaging();

  for (const [uid, notifs] of byUid) {
    const settingsSnap = await db.collection("settings").doc(uid).get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};

    const tokensSnap = await db.collection("push_tokens").where("uid", "==", uid).get();
    const tokens = tokensSnap.docs.map((d) => d.id);

    const batch = db.batch();
    for (const n of notifs) {
      if (tokens.length > 0 && pushAllowedForIcon(n.icon, settings)) {
        const response = await messaging.sendEachForMulticast({
          tokens,
          notification: { title: "Fanfarra", body: n.text },
          data: { url: "/notifications" },
        });
        response.responses.forEach((r, i) => {
          if (!r.success && r.error?.code === "messaging/registration-token-not-registered") {
            db.collection("push_tokens").doc(tokens[i]).delete().catch(() => {});
          }
        });
      }
      batch.update(n.ref, { pushed: true });
    }
    await batch.commit();
  }
  console.log(`[push] processadas notificações de ${byUid.size} usuário(s).`);
}