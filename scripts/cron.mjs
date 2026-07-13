// scripts/cron.mjs
// Roda fora do Firebase (GitHub Actions) usando o Admin SDK.
// Resolve os dois "crons preguiçosos" do awardsStore.ts / recReactions.ts
// sem precisar do plano Blaze.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

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
// 1) Virada de fase do Fanfarra Awards (+ abertura/fechamento agendados)
// (mesma lógica do awardsStore.ts, portada pro Admin SDK)
// ───────────────────────────────────────────────────────────
async function advanceAwardsPhase() {
  const configRef = db.collection("awards_config").doc("current");
  const configSnap = await configRef.get();
  if (!configSnap.exists) return console.log("[awards] sem config, ignorando.");
  const config = configSnap.data();
  // Blindagem: campos numéricos podem ter sido salvos como texto no Console.
  config.year = Number(config.year);
  for (const key of ["recomendacaoDeadline", "indicacaoDeadline", "finalDeadline", "scheduledStartAt", "scheduledEndAt"]) {
    if (config[key] !== undefined) config[key] = Number(config[key]);
  }
  const now = Date.now();

  const catalogSnap = await db.collection("awards_catalog").get();
  const categories = catalogSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (categories.length === 0) return console.log("[awards] sem categorias, ignorando.");

// Abertura automática agendada — roda sozinha mesmo com o app fechado,
  // já que este script é disparado pelo GitHub Actions. Não importa em que
  // fase o Awards está agora (antes só funcionava se já estivesse em
  // "resultado", por isso o agendamento nunca abria quando a fase atual
  // era "indicacao", "final" etc).
  if (config.scheduledStartAt && config.scheduledEndAt && now >= config.scheduledStartAt) {
    await openScheduledCycle(categories, config.scheduledEndAt);
    return;
  }

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

// Mesma regra do cliente: themeId pode listar vários tipos (separados por
// vírgula/barra) ou ser um coringa ("*", "todos", "all").
function themeIdMatches(themeId, typeSlug) {
  const normalized = slugifyType(themeId ?? "");
  if (normalized === "*" || normalized === "todos" || normalized === "all") return true;
  return (themeId ?? "").split(/[,/]/).map((part) => slugifyType(part)).includes(typeSlug);
}

// Só conta reações com createdAt <= prazo — igual ao getRecReactionCountsAsOf do cliente.
async function getReactionCountsAsOf(deadline) {
  const snap = await db.collection("rec_reactions").where("createdAt", "<=", deadline).get();
  const result = new Map();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (!data.itemId || !data.reaction) return;
    const current = result.get(data.itemId) ?? { likes: 0, boos: 0 };
    if (data.reaction === "like") current.likes += 1;
    else if (data.reaction === "boo") current.boos += 1;
    result.set(data.itemId, current);
  });
  return result;
}

async function freezeNominationsAndAdvance(categories, config) {
  const freezeDeadline = config.recomendacaoDeadline ?? Date.now();
  const [recsSnap, countsById] = await Promise.all([
    db.collection("communityRecs").get(),
    getReactionCountsAsOf(freezeDeadline),
  ]);

  const byTheme = new Map();
  recsSnap.docs.forEach((d) => {
    const r = d.data();
    if (!r.title || !r.type) return;
    const itemId = `community_${d.id}`;
    const counts = countsById.get(itemId) ?? { likes: 0, boos: 0 };
    const typeSlug = slugifyType(r.type);
    if (!byTheme.has(typeSlug)) byTheme.set(typeSlug, []);
    byTheme.get(typeSlug).push({ itemId, title: r.title, type: r.type, cover: r.cover ?? null, likes: counts.likes, boos: counts.boos });
  });

  const batch = db.batch();
  categories.forEach((c) => {
    const kind = c.kind ?? "melhor"; // mesmo fallback do cliente
    const items = [];
    byTheme.forEach((list, typeSlug) => {
      if (themeIdMatches(c.themeId, typeSlug)) items.push(...list);
    });
    const ranked = items
      .filter((i) => (kind === "melhor" ? i.likes > 0 : i.boos > 0))
      .sort((a, b) => (kind === "melhor" ? b.likes - a.likes : b.boos - a.boos))
      .slice(0, 10);
    batch.set(
      db.collection("awards_catalog").doc(c.id),
      { nominees: ranked.map((i) => i.title), nomineeDetails: ranked },
      { merge: true },
    );
  });
  batch.set(db.collection("awards_config").doc("current"), {
    phase: "indicacao",
    indicacaoDeadline: freezeDeadline + WEEK_MS,
  }, { merge: true });
  await batch.commit();
  console.log("[awards] fase avançada: recomendacao → indicacao");
}

async function advanceIndicacaoToFinal(categories, config) {
  const deadline = config.indicacaoDeadline ?? Date.now();
  const snap = await db.collection("award_votes_indicacao").where("confirmed", "==", true).get();
  const allVotes = snap.docs
    .map((d) => d.data())
    .filter((v) => v.confirmedAt === undefined || v.confirmedAt <= deadline);

  const batch = db.batch();
  categories.forEach((c) => {
    const counts = {};
    allVotes.forEach((v) => {
      const nominee = v.votes?.[c.id];
      if (nominee) counts[nominee] = (counts[nominee] ?? 0) + 1;
    });
    const top5 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    const detailsByTitle = new Map((c.nomineeDetails ?? []).map((d) => [d.title, d]));
    const top5Details = top5.map((title) => detailsByTitle.get(title) ?? { itemId: title, title, likes: 0, boos: 0 });
    batch.set(db.collection("awards_catalog").doc(c.id), { nominees: top5, finalists: top5, finalistDetails: top5Details }, { merge: true });
  });
  batch.set(db.collection("awards_config").doc("current"), {
    phase: "final",
    finalDeadline: deadline + WEEK_MS,
  }, { merge: true });
  await batch.commit();
  console.log("[awards] fase avançada: indicacao → final");
}

async function advanceFinalToResultado() {
  await db.collection("awards_config").doc("current").set({ phase: "resultado" }, { merge: true });
  console.log("[awards] fase avançada: final → resultado");
}

// Abre a próxima edição agendada — zera indicados/finalistas da edição
// anterior e já entra em "recomendacao" com o prazo de fechamento certo.
async function openScheduledCycle(categories, recomendacaoDeadline) {
  const batch = db.batch();
  categories.forEach((c) => {
    batch.set(db.collection("awards_catalog").doc(c.id), {
      nominees: [],
      nomineeDetails: [],
      finalists: [],
      finalistDetails: [],
    }, { merge: true });
  });
  batch.set(db.collection("awards_config").doc("current"), {
    phase: "recomendacao",
    recomendacaoDeadline,
    scheduledStartAt: FieldValue.delete(),
    scheduledEndAt: FieldValue.delete(),
  }, { merge: true });
  await batch.commit();
  console.log("[awards] edição agendada aberta automaticamente.");
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