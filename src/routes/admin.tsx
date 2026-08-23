import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { AdminPanel } from "@/components/fanfarra/AdminPanel";
import { useIsAdmin } from "@/lib/fanfarra/config";
import { useAuthReady, useAuthUser } from "@/lib/fanfarra/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Fanfarra" }] }),
  component: AdminPage,
});

function AdminPage() {
  const nav = useNavigate();
  const router = useRouter();
  const user = useAuthUser();
  const authReady = useAuthReady();
  const isAdmin = useIsAdmin(user?.uid);

  // Espera o Firebase confirmar a sessão antes de decidir se expulsa o
  // usuário — sem isso, ele seria chutado pra "/" por uma fração de
  // segundo mesmo sendo admin, enquanto o auth ainda está carregando.
  // Também espera o router terminar qualquer transição em andamento:
  // redirecionar no meio de uma navegação é o que causava o erro
  // "Could not find match for matchId" e travava o app.
  useEffect(() => {
    if (!authReady) return;
    const decide = () => {
      if (!isAdmin) nav({ to: "/" });
    };
    if (router.state.status === "pending") {
      return router.subscribe("onResolved", () => decide());
    }
    decide();
  }, [authReady, isAdmin, nav, router]);

  if (!authReady || !isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
          <ShieldAlert size={28} color="var(--fan-text-2)" />
          <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            {authReady ? "Acesso restrito." : "Verificando acesso..."}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Painel Admin
        </h1>
        <span className="w-6" />
      </header>

      <AdminPanel />
    </AppShell>
  );
}