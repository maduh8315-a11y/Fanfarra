// scripts/cron.mjs
// Roda fora do Firebase (GitHub Actions) usando o Admin SDK.
// Resolve os dois "crons preguiçosos" do awardsStore.ts / recReactions.ts
// sem precisar do plano Blaze.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TZ = "America/Sao_Paulo";

function todayKeyBR(date = new Date()) {
  // Chave "YYYY-MM-DD" no fuso de Brasília, imune a horário do runner do GitHub (que roda em UTC).
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// ───────────────────────────────────────────────────────────
// 1) Virada de fase do Fanfarra Awards
// (mesma lógica de checkAndAdvanceAwardsPhase, portada pro Admin SDK)
// ───────────────────────────────────────────────────────────
async function advanceAwardsPhase() {
  const configRef = db.collection("awards_config").doc("current");
  const configSnap = await configRef.get();
  if (!configSnap.exists) return console.log("[awards] sem config, ignorando.");
  const config = configSnap.data();
  const now = Date.now();

  const catalogSnap = await db.collection("awards_catalog").get();
  const categories = catalogSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (categories.length === 0) return console.log("[awards] sem categorias, ignorando.");

  if (config.phase === "recomendacao") {
    if (!config.recomendacaoDeadline || now < config.recomendacaoDeadline) return;
    await freezeNominationsAndAdvance(categories, config);
  } else if (config.phase === "indicacao") {
    if (!config.indicacaoDeadline || now < config.indicacaoDeadline) return;
    await advanceIndicacaoToFinal(categories, config);
  } else if (config.phase === "final") {
    if (!config.finalDeadline || now < config.finalDeadline) return;
    await advanceFinalToResultado();
  }
}

function slugifyType(type) {
  return type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "-");
}

async function freezeNominationsAndAdvance(categories, config) {
  const [recsSnap, countsSnap] = await Promise.all([
    db.collection("communityRecs").get(),
    db.collection("rec_reaction_counts").get(),
  ]);
  const countsById = new Map();
  countsSnap.docs.forEach((d) => countsById.set(d.id, d.data()));

  const byTheme = new Map();
  recsSnap.docs.forEach((d) => {
    const r = d.data();
    if (!r.title || !r.type) return;
    const counts = countsById.get(`community_${d.id}`) ?? { likes: 0, boos: 0 };
    const themeId = slugifyType(r.type);
    if (!byTheme.has(themeId)) byTheme.set(themeId, []);
    byTheme.get(themeId).push({ title: r.title, likes: counts.likes ?? 0, boos: counts.boos ?? 0 });
  });

  const batch = db.batch();
  categories.forEach((c) => {
    const items = byTheme.get(c.themeId) ?? [];
    const ranked = items
      .filter((i) => (c.kind === "melhor" ? i.likes > 0 : i.boos > 0))
      .sort((a, b) => (c.kind === "melhor" ? b.likes - a.likes : b.boos - a.boos));
    batch.set(db.collection("awards_catalog").doc(c.id), { nominees: ranked.slice(0, 10).map((i) => i.title) }, { merge: true });
  });
  batch.set(db.collection("awards_config").doc("current"), {
    phase: "indicacao",
    indicacaoDeadline: (config.recomendacaoDeadline ?? Date.now()) + WEEK_MS,
  }, { merge: true });
  await batch.commit();
  console.log("[awards] fase avançada: recomendacao → indicacao");
}

async function advanceIndicacaoToFinal(categories, config) {
  const snap = await db.collection("award_votes_indicacao").where("confirmed", "==", true).get();
  const allVotes = snap.docs.map((d) => d.data());

  const batch = db.batch();
  categories.forEach((c) => {
    const counts = {};
    allVotes.forEach((v) => {
      const nominee = v.votes?.[c.id];
      if (nominee) counts[nominee] = (counts[nominee] ?? 0) + 1;
    });
    const top5 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    batch.set(db.collection("awards_catalog").doc(c.id), { nominees: top5, finalists: top5 }, { merge: true });
  });
  batch.set(db.collection("awards_config").doc("current"), {
    phase: "final",
    finalDeadline: (config.indicacaoDeadline ?? Date.now()) + WEEK_MS,
  }, { merge: true });
  await batch.commit();
  console.log("[awards] fase avançada: indicacao → final");
}

async function advanceFinalToResultado() {
  await db.collection("awards_config").doc("current").set({ phase: "resultado" }, { merge: true });
  console.log("[awards] fase avançada: final → resultado");
}

// ───────────────────────────────────────────────────────────
// 2) Foto diária dos aplausos/vaias (à meia-noite de Brasília)
// Congela os números do dia numa coleção separada. O contador
// "vivo" (rec_reaction_counts) continua acumulando o ano inteiro
// normalmente — essa foto é só o "placar oficial fechado do dia".
// ───────────────────────────────────────────────────────────
async function freezeDailyReactionSnapshot() {
  const key = todayKeyBR(); // dia que está FECHANDO agora
  const alreadyDone = await db.collection("rec_reaction_daily_snapshot").doc(key).get();
  if (alreadyDone.exists) return console.log(`[daily] snapshot de ${key} já existe, pulando.`);

  const countsSnap = await db.collection("rec_reaction_counts").get();
  const items = {};
  countsSnap.docs.forEach((d) => {
    const data = d.data();
    items[d.id] = { likes: data.likes ?? 0, boos: data.boos ?? 0 };
  });

  await db.collection("rec_reaction_daily_snapshot").doc(key).set({
    date: key,
    items,
    frozenAt: Timestamp.now(),
  });
  console.log(`[daily] snapshot de ${key} gravado com ${Object.keys(items).length} itens.`);
}

await advanceAwardsPhase();
await freezeDailyReactionSnapshot();
process.exit(0);