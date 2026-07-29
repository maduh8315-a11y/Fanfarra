// scripts/lib/cronjobControl.mjs
// Liga/desliga o cronjob "rápido" (2 em 2 min) do cron-job.org.
// Ele só precisa ficar ativo perto de uma virada de fase (abertura ou
// fechamento de prazo); o resto do tempo fica desligado pra não gastar
// minutos do GitHub Actions à toa.

const API_KEY = process.env.CRONJOB_API_KEY;
const FAST_JOB_ID = process.env.CRONJOB_FAST_JOB_ID;
const WINDOW_MS = 10 * 60 * 1000; // liga o rápido com 10min de antecedência

async function setFastPolling(enabled) {
  if (!API_KEY || !FAST_JOB_ID) {
    console.log("[cronjobControl] CRONJOB_API_KEY/CRONJOB_FAST_JOB_ID não configurados, ignorando.");
    return;
  }
  const res = await fetch(`https://api.cron-job.org/jobs/${FAST_JOB_ID}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ job: { enabled } }),
  });
  if (!res.ok) {
    console.log(`[cronjobControl] falha ao ${enabled ? "ligar" : "desligar"} job rápido: ${res.status} ${await res.text()}`);
    return;
  }
  console.log(`[cronjobControl] job rápido ${enabled ? "LIGADO (perto de uma virada)" : "desligado"}.`);
}

export async function syncFastPolling(checkpoint) {
  const now = Date.now();
  const isNear = typeof checkpoint === "number" && !Number.isNaN(checkpoint) && checkpoint - now <= WINDOW_MS;
  await setFastPolling(isNear);
}