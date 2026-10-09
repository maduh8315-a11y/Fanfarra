// Gera dist/client/index.html (o "casco" do app) rodando o servidor já buildado
// uma única vez, em modo SPA. Esse index.html é o que o app Android carrega
// localmente — assim o app não depende do site publicado para abrir.
import { writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

process.env.TSS_PRERENDERING = "true";

const serverPath = path.resolve("dist/server/server.js");
const mod = await import(pathToFileURL(serverPath).href);
const server = mod.default ?? mod;

const res = await server.fetch(
  new Request("http://localhost/", { headers: { "X-TSS_SHELL": "true" } }),
  {},
  { waitUntil() {}, passThroughOnException() {} },
);
if (!res.ok) throw new Error(`Falha ao gerar o casco do app: HTTP ${res.status}`);
const html = await res.text();
await mkdir("dist/client", { recursive: true });
await writeFile("dist/client/index.html", html);
console.log(`dist/client/index.html gerado (${html.length} bytes)`);