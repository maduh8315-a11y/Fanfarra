// screenshot-all-pages.mjs
//
// Tira um screenshot de TODAS as páginas do app Fanfarra, simulando a tela
// de um celular (já que o app carrega essa mesma URL dentro de uma WebView —
// ver nota importante no final deste comentário).
//
// COMO USAR:
// 1) Instale as dependências (uma vez só):
//      npm install --save-dev playwright
//      npx playwright install chromium
//
// 2) Rode o script passando a URL do seu site publicado:
//      node screenshot-all-pages.mjs https://fanfarra-backend.SEUSUBDOMINIO.workers.dev
//
// 3) Abra o arquivo screenshots/_gallery.html no navegador pra ver todas as
//    páginas lado a lado, sem precisar clicar imagem por imagem.
//
// NOTA IMPORTANTE sobre o app: seu capacitor.config.ts está configurado com
// server.url apontando pra "https://fanfarra-backend.fanfarra.workers.dev/".
// Isso significa que o app Android NÃO usa os arquivos que ficam empacotados
// dentro do .apk — ele abre essa URL ao vivo dentro de uma WebView. Ou seja,
// checar o site publicado É checar o app. Só fique de olho: depois que você
// migrar pra conta nova do Cloudflare, esse subdomínio "fanfarra.workers.dev"
// pode mudar (cada conta tem o seu próprio subdomínio workers.dev). Se mudar,
// você vai precisar atualizar essa URL no capacitor.config.ts e gerar um novo
// APK, senão o app antigo vai abrir uma página que não existe mais.

import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error(
    "Uso: node screenshot-all-pages.mjs https://sua-url-publicada.workers.dev",
  );
  process.exit(1);
}

// Rotas do app. Os campos com ":" precisam de um valor real (um id que
// exista no seu banco) pra não cair numa tela de "não encontrado". Edite os
// valores de exemplo abaixo pelos IDs reais que você usa pra testar.
const sampleIds = {
  type: "livro", // usado em /add/:type — troque pelo tipo real (ex: "livro", "serie")
  recId: "SBINsB0LzdYK3m9BxuZP", // usado em /rec/:id e /work/:id 
  workId: "dPfOonGK93gjcFvFDUpz",
  uid: "LqQiPBXWothXHAwYPNHtONl8hmq1_cetEQ9OoVzcMxVgctwoZbNDUR7B3", // usado em /chat/:uid e /admin/suspend/:uid
  usernameProfiles: "maduhnovo", // usado em /u/:username
  usernamePublicProfiles: "Fanfarra"
};

const routes = [
  "/",
  "/about",
  "/add",
  `/add/${sampleIds.type}`,
  "/admin",
  "/admin/banned-users",
  `/admin/suspend/${sampleIds.uid}`,
  "/awards",
  "/challenges",
  "/chat",
  `/chat/${sampleIds.uid}`,
  "/collections",
  "/feedback",
  "/forgot-password",
  "/friends",
  "/help",
  "/library",
  "/login",
  "/notifications",
  "/onboarding",
  "/privacy",
  "/pro",
  "/profile",
  `/rec/${sampleIds.recId}`,
  "/recommendations",
  "/register",
  "/search",
  "/settings",
  "/splash",
  "/stats",
  "/terms",
  `/u/${sampleIds.usernameProfiles}`,
  `/u/${sampleIds.usernamePublicProfiles}`,
  "/updates",
  "/verify-email",
  `/work/${sampleIds.workId}`,
  `/work/${sampleIds.workId}/edit`,
  "/wrapped",
];

// Preencha com um usuário de teste do seu app pra conseguir tirar print das
// páginas que exigem login (admin, chat, profile, settings, etc). Se deixar
// em branco, essas páginas continuam caindo na tela de login.
const loginCredentials = {
  email: "aiko.rubiyuri@gmail.com",    // ex: "voce@email.com"
  password: "Meduarda5kj*@", // a senha desse usuário
};

const outDir = path.resolve("screenshots");
fs.mkdirSync(outDir, { recursive: true });

const results = [];

async function run() {
  const browser = await chromium.launch();
  // Emula um celular real (tamanho de tela, pixel ratio, touch etc.)
  const context = await browser.newContext({
    ...devices["Pixel 7"],
  });

  // Evita que toda página caia na tela de onboarding OU no tour guiado
  // (o overlay "1 de 20 Início...") — o app só mostra essas coisas quando
  // essas chaves não existem no localStorage.
  await context.addInitScript(() => {
    localStorage.setItem("fanfarra:onboarding_done", "1");
    localStorage.setItem("fanfarra:tour_done", "1");
  });

  const page = await context.newPage();

  // Faz login uma única vez (se você preencheu as credenciais acima) e
  // reaproveita essa mesma sessão logada pra todas as páginas seguintes.
  if (loginCredentials.email && loginCredentials.password) {
    console.log("Fazendo login...");
    await page.goto(baseUrl.replace(/\/$/, "") + "/login", { waitUntil: "networkidle" });

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await emailInput.waitFor({ state: "visible", timeout: 15000 });

    // Preenche e confirma que o valor realmente ficou no campo (evita perder
    // o texto se a página ainda estiver "hidratando" o React nesse instante).
    await emailInput.fill(loginCredentials.email);
    await passwordInput.fill(loginCredentials.password);
    if ((await emailInput.inputValue()) !== loginCredentials.email) {
      await emailInput.fill(loginCredentials.email);
    }
    if ((await passwordInput.inputValue()) !== loginCredentials.password) {
      await passwordInput.fill(loginCredentials.password);
    }

    await page.click('button[type="submit"]');

    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
      console.log("✅ Login feito com sucesso.\n");
    } catch {
      console.log(
        "⚠️  O login NÃO completou — continuou preso na tela de login. Confira se o e-mail/senha em loginCredentials estão certos, e se essa conta não exige verificação extra (e-mail não confirmado, 2FA, etc). Vou continuar mesmo assim, mas as páginas que exigem login vão sair como tela de login.\n",
      );
    }
  }

  for (const route of routes) {
    const url = baseUrl.replace(/\/$/, "") + route;
    const fileName = (route === "/" ? "home" : route.replace(/\//g, "_")) + ".png";
    const filePath = path.join(outDir, fileName);

    try {
      const response = await page.goto(url, {
        waitUntil: "load",
        timeout: 20000,
      });
      // dá um tempo extra pra animações/loading/conteúdo dinâmico renderizar
      await page.waitForTimeout(2500);
      await page.screenshot({ path: filePath, fullPage: true });

      const status = response ? response.status() : "?";
      console.log(`✅ ${route}  (status ${status}) -> ${fileName}`);
      results.push({ route, fileName, status, ok: true });
    } catch (err) {
      console.log(`❌ ${route}  ERRO: ${err.message}`);
      results.push({ route, fileName: null, status: "erro", ok: false, error: err.message });
    }
  }

  await browser.close();
  writeGallery(results);
}

function writeGallery(results) {
  const cards = results
    .map((r) => {
      if (!r.ok) {
        return `<div class="card error">
          <div class="route">${r.route}</div>
          <div class="status">❌ ${r.error}</div>
        </div>`;
      }
      return `<div class="card">
          <div class="route">${r.route}</div>
          <div class="status">status ${r.status}</div>
          <img src="${r.fileName}" loading="lazy" />
        </div>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8" />
<title>Galeria de páginas — Fanfarra</title>
<style>
  body { font-family: system-ui, sans-serif; background:#111; color:#eee; margin:0; padding:24px; }
  h1 { font-size: 20px; }
  .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:20px; margin-top:20px; }
  .card { background:#1c1c1c; border-radius:10px; padding:12px; }
  .card.error { border: 2px solid #ff5555; }
  .route { font-weight:bold; margin-bottom:6px; font-size:14px; }
  .status { font-size:12px; color:#999; margin-bottom:8px; }
  img { width:100%; border-radius:6px; display:block; }
</style>
</head>
<body>
  <h1>Todas as páginas — ${baseUrl}</h1>
  <p>${results.filter((r) => r.ok).length} de ${results.length} páginas capturadas com sucesso.</p>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, "_gallery.html"), html, "utf-8");
  console.log(`\nPronto! Abra screenshots/_gallery.html no navegador pra revisar tudo.`);
}

run();
