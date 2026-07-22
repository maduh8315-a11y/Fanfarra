import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  const user = useAuthUser();
  const authReady = useAuthReady();
  const isAdmin = useIsAdmin(user?.uid);

  // Espera o Firebase confirmar a sessão antes de decidir se expulsa o
  // usuário — sem isso, ele seria chutado pra "/" por uma fração de
  // segundo mesmo sendo admin, enquanto o auth ainda está carregando.
  useEffect(() => {
    if (authReady && !isAdmin) {
      nav({ to: "/" });
    }
  }, [authReady, isAdmin, nav]);

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