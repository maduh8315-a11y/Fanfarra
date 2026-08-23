// src/lib/sitemap.server.ts
// Gera o sitemap.xml dinamicamente: páginas estáticas públicas + um <url>
// pra cada perfil público não-privado. Usa a service account (mesmo cliente
// REST do resto do backend) porque Googlebot nunca loga no app, então a
// leitura via SDK client (que exige auth) não serviria aqui.
import { FirestoreTransaction } from "./googleFirestoreRest.server";

const STATIC_PATHS = ["/", "/about", "/terms", "/privacy"];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function handleSitemapRequest(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const urls: { loc: string; changefreq: string; priority: string }[] = STATIC_PATHS.map((path) => ({
    loc: `${origin}${path}`,
    changefreq: "weekly",
    priority: path === "/" ? "1.0" : "0.5",
  }));

  try {
    const tx = await FirestoreTransaction.begin();
    const profiles = await tx.listAll<{ username: string; isPrivate?: boolean; whoCanFollow?: string }>(
      "public_profiles",
      5000,
    );
    await tx.rollback(); // só leitura

    profiles
      .filter((p) => !p.data.isPrivate && p.data.username)
      .forEach((p) => {
        urls.push({
          loc: `${origin}/u/${encodeURIComponent(p.data.username)}`,
          changefreq: "daily",
          priority: "0.7",
        });
      });
  } catch (err) {
    // Se o Firestore falhar, ainda devolve o sitemap com as páginas
    // estáticas — melhor um sitemap parcial do que um 500 pro Google.
    console.error("Erro ao montar sitemap de perfis:", err);
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600", // 1h de cache — não precisa gerar a cada request
    },
  });
}