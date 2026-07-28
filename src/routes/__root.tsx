import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuthUser, useAuthReady } from "@/lib/fanfarra/auth";
import { useSettings } from "@/lib/fanfarra/extras";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import "../lib/sentry";
import { Toaster } from "@/components/ui/sonner";
import { patchServerFnBaseUrl } from "@/lib/nativeApiPatch";
import { registerServiceWorker } from "@/lib/fanfarra/registerServiceWorker";

patchServerFnBaseUrl();
registerServiceWorker();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Algo deu errado</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "theme-color", content: "#0d0008" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Fanfarra" },
      { name: "application-name", content: "Fanfarra" },
      { title: "Fanfarra — Seu universo fandom" },
      {
        name: "description",
        content: "Acompanhe animes, mangás, fanfics, livros, jogos e mais em um só lugar.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@600;700;800;900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" translate="no">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <CrashRecovery />
      <ApplyTheme />
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}

// Aplica o tema salvo (default/lunar/aurora) e o modo (claro/escuro) trocando
// os atributos data-theme e data-mode da tag <html> — são esses atributos que
// os seletores do styles.css escutam. Os dois são independentes: qualquer
// tema pode ser combinado com claro ou escuro.
function ApplyTheme() {
  const { theme, mode } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.theme = theme === "default" ? "" : theme;
    document.documentElement.dataset.mode = mode === "dark" ? "" : mode;
  }, [theme, mode]);
  return null;
}

// ─── AUTH GUARD — protege as rotas que exigem login ──────────────────────────
const PUBLIC_ROUTES = new Set([
  "/splash",
  "/onboarding",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
]);
const AUTH_ONLY_PUBLIC = new Set(["/login", "/register", "/onboarding"]);

function AuthGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const user = useAuthUser();
  const authReady = useAuthReady();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return; // espera o Firebase confirmar a sessão antes de decidir
    if (typeof window === "undefined") return;

    const decide = () => {
      const isPublic = PUBLIC_ROUTES.has(pathname);
      if (!user && !isPublic) {
        const seen = !import.meta.env.DEV && localStorage.getItem("fanfarra:auth_seen") === "1";
        navigate({ to: seen ? "/login" : "/splash" });
        if (!seen) localStorage.setItem("fanfarra:auth_seen", "1");
        return;
      }
      if (user && AUTH_ONLY_PUBLIC.has(pathname)) {
        navigate({ to: "/" });
      }
    };

    // Se o router ainda estiver no meio de uma navegação (comum logo após o
    // carregamento inicial, principalmente em celulares mais lentos),
    // espera ele terminar antes de redirecionar. Redirecionar no meio de
    // uma transição em andamento é o que causava o erro "Could not find
    // match for matchId" e travava o app com tela branca.
    if (router.state.status === "pending") {
      return router.subscribe("onResolved", () => decide());
    }
    decide();
  }, [pathname, user, navigate, authReady, router]);

  return null;
}

// ─── REDE DE SEGURANÇA — nunca mais deixa o app travado em tela branca ──────
// Se por algum motivo escapar um erro do tipo "Could not find match" (o
// mesmo que causava a tela branca no celular), recarrega a página sozinho
// em vez de deixar a pessoa presa numa tela em branco. Só recarrega uma vez
// a cada 10s pra nunca entrar em loop caso o erro seja outra coisa.
function CrashRecovery() {
  useEffect(() => {
    const handler = (event: ErrorEvent | PromiseRejectionEvent) => {
      const message =
        "message" in event ? event.message : String((event as PromiseRejectionEvent).reason);
      if (!message || !message.includes("Could not find match for matchId")) return;

      const lastReload = Number(sessionStorage.getItem("fanfarra:crash_reload") || 0);
      if (Date.now() - lastReload < 10_000) return; // evita loop de reload
      sessionStorage.setItem("fanfarra:crash_reload", String(Date.now()));
      window.location.reload();
    };

    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", handler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);

  return null;
}