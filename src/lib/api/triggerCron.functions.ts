import { createServerFn } from "@tanstack/react-start";

// Server function que dá a "primeira largada" na corrente de execuções do
// cron do Awards, chamada pelo AdminPanel assim que uma fase é aberta/uma
// nova edição é iniciada. Roda no servidor porque o token do GitHub não
// pode ficar exposto no client.
export const triggerAwardsCron = createServerFn({ method: "POST" }).handler(async () => {
  const token = process.env.GH_DISPATCH_TOKEN;
  const repo = process.env.GH_REPO;
  if (!token || !repo) {
    console.error("[triggerAwardsCron] GH_DISPATCH_TOKEN/GH_REPO não configurados no servidor.");
    return { ok: false };
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/fanfarra-cron.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }), // troque "main" se sua branch padrão tiver outro nome
      },
    );
    return { ok: res.ok };
  } catch (err) {
    console.error("[triggerAwardsCron] erro ao disparar:", err);
    return { ok: false };
  }
});