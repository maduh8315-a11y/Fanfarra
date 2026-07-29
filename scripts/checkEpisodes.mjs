// scripts/checkEpisodes.mjs
// Roda 1x por dia (GitHub Actions). Verifica obras "Em andamento"
// (Assistindo/Lendo) importadas do AniList e avisa o dono assim que sai
// episódio/capítulo novo.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { sendPendingPushNotifications } from "./lib/push.mjs";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const ANILIST_RE = /anilist\.co\/(anime|manga)\/(\d+)/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Descobre quantos episódios/capítulos já saíram de verdade. Pra anime em
// exibição, o total "final" costuma vir em branco no AniList — o dado
// confiável é o próximo episódio agendado (nextAiringEpisode). Pra mangá,
// usamos o total catalogado (some conforme a comunidade do AniList atualiza).
async function fetchAniListProgress(kind, id) {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        episodes
        chapters
        nextAiringEpisode { episode }
      }
    }
  `;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { id: Number(id) } }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const media = json?.data?.Media;
  if (!media) return null;

  if (kind === "anime") {
    if (media.nextAiringEpisode?.episode) return media.nextAiringEpisode.episode - 1;
    return media.episodes ?? null;
  }
  return media.chapters ?? null;
}

async function checkForNewEpisodes() {
  const snap = await db.collection("works").where("status", "in", ["Assistindo", "Lendo"]).get();

  const candidates = snap.docs
    .map((d) => ({ ref: d.ref, ...d.data() }))
    .filter((w) => typeof w.link === "string" && ANILIST_RE.test(w.link));

  if (candidates.length === 0) return console.log("[episodes] nenhuma obra elegível encontrada.");

  // Agrupa por título do AniList — várias pessoas podem acompanhar a mesma
  // obra, e não faz sentido bater na API uma vez por pessoa.
  const groups = new Map();
  candidates.forEach((w) => {
    const m = w.link.match(ANILIST_RE);
    const kind = m[1] === "anime" ? "anime" : "manga";
    const id = m[2];
    const key = `${kind}:${id}`;
    if (!groups.has(key)) groups.set(key, { kind, id, works: [] });
    groups.get(key).works.push(w);
  });

  console.log(`[episodes] ${candidates.length} obra(s) elegível(is), ${groups.size} título(s) único(s) a consultar.`);

  let batch = db.batch();
  let opsInBatch = 0;
  let notified = 0;

  for (const { kind, id, works } of groups.values()) {
    let released = null;
    try {
      released = await fetchAniListProgress(kind, id);
    } catch (err) {
      console.error(`[episodes] falha ao consultar AniList ${kind}/${id}:`, err);
    }
    await sleep(700); // respeita o rate limit público do AniList

    if (released == null) continue;

    for (const w of works) {
      const known = w.details?.latestAvailable ?? 0;
      if (released <= known) continue; // nada novo pra essa obra

      // atualiza o número conhecido sempre que sobe
      batch.set(w.ref, { details: { latestAvailable: released } }, { merge: true });
      opsInBatch++;

      // só notifica se o que saiu é além do que a pessoa já assistiu/leu
      if (released > (w.current ?? 0)) {
        const noun = kind === "anime" ? "Episódio" : "Capítulo";
        batch.set(db.collection("notifications").doc(), {
          uid: w.uid,
          icon: "play-circle",
          text: `${noun} ${released} de "${w.title}" já está disponível!`,
          ts: Date.now(),
          read: false,
          pushed: false,
        });
        opsInBatch++;
        notified++;
      }

      if (opsInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) await batch.commit();
  console.log(`[episodes] concluído. ${notified} notificação(ões) criada(s).`);
}

await checkForNewEpisodes();
await sendPendingPushNotifications(db);
process.exit(0);