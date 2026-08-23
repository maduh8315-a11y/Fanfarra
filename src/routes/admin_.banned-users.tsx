import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert, ShieldOff, Ban, Clock } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useAuthReady, useAuthUser } from "@/lib/fanfarra/auth";
import { useIsAdmin } from "@/lib/fanfarra/config";
import { listBannedUsers, unbanUser, type BannedUserEntry } from "@/lib/fanfarra/moderationActions";

export const Route = createFileRoute("/admin_/banned-users")({
  head: () => ({ meta: [{ title: "Usuários banidos — Fanfarra" }] }),
  component: BannedUsersPage,
});

type Tab = "banned" | "suspended";

function BannedUsersPage() {
  const nav = useNavigate();
  const router = useRouter();
  const user = useAuthUser();
  const authReady = useAuthReady();
  const isAdmin = useIsAdmin(user?.uid);

  const [users, setUsers] = useState<BannedUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertingUid, setRevertingUid] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("banned");

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

  const loadUsers = () => {
    setLoading(true);
    listBannedUsers()
      .then(setUsers)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Não foi possível carregar a lista."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authReady && isAdmin) loadUsers();
  }, [authReady, isAdmin]);

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

  const handleRevert = async (entry: BannedUserEntry) => {
    if (!confirm(`Reverter o banimento/suspensão de @${entry.username}?`)) return;
    setRevertingUid(entry.uid);
    try {
      await unbanUser(entry.uid);
      toast.success("Banimento/suspensão revertido(a).");
      setUsers((prev) => prev.filter((u) => u.uid !== entry.uid));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reverter.");
    } finally {
      setRevertingUid(null);
    }
  };

  const bannedUsers = users.filter((u) => u.banned);
  const suspendedUsers = users.filter((u) => !u.banned && u.suspendedUntil > Date.now());
  const visibleUsers = tab === "banned" ? bannedUsers : suspendedUsers;

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/admin" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Usuários banidos/suspensos
        </h1>
        <span className="w-6" />
      </header>

      <div className="px-4 pb-10">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("banned")}
            className="flex-1 text-[12px] px-2 py-1.5 rounded-full font-bold flex items-center justify-center gap-1"
            style={{
              border: "1px solid #8b0000",
              color: tab === "banned" ? "#fff" : "#ff8080",
              background: tab === "banned" ? "#8b0000" : "transparent",
            }}
          >
            <Ban size={12} /> Banidos ({bannedUsers.length})
          </button>
          <button
            onClick={() => setTab("suspended")}
            className="flex-1 text-[12px] px-2 py-1.5 rounded-full font-bold flex items-center justify-center gap-1"
            style={{
              border: "1px solid #f5a623",
              color: tab === "suspended" ? "#fff" : "#f5a623",
              background: tab === "suspended" ? "#f5a623" : "transparent",
            }}
          >
            <Clock size={12} /> Suspensos ({suspendedUsers.length})
          </button>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            Carregando...
          </p>
        ) : visibleUsers.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            {tab === "banned" ? "Nenhum usuário banido no momento." : "Nenhum usuário suspenso no momento."}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleUsers.map((u) => (
              <div
                key={u.uid}
                className="rounded-[12px] p-3"
                style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="h-8 w-8 overflow-hidden rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ background: "var(--fan-bg)", color: "var(--fan-icon-blue)" }}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.username} className="h-full w-full object-cover" />
                    ) : (
                      u.username.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <Link
                    to="/u/$username"
                    params={{ username: u.username }}
                    className="font-bold text-sm underline"
                    style={{ color: "var(--fan-text)" }}
                  >
                    @{u.username}
                  </Link>
                </div>

                {tab === "suspended" && (
                  <p className="text-[11px] mb-1" style={{ color: "var(--fan-text-2)" }}>
                    Suspenso até {new Date(u.suspendedUntil).toLocaleString("pt-BR")}
                  </p>
                )}
                {u.actionAt && (
                  <p className="text-[11px] mb-1" style={{ color: "var(--fan-text-3)" }}>
                    Ação em {new Date(u.actionAt).toLocaleString("pt-BR")}
                  </p>
                )}
                {u.actionReason && (
                  <p className="text-[11px] mb-2" style={{ color: "var(--fan-text-2)" }}>
                    Motivo: "{u.actionReason}"
                  </p>
                )}

                <button
                  onClick={() => handleRevert(u)}
                  disabled={revertingUid === u.uid}
                  className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"
                  style={{ background: "transparent", color: "#4ade80", border: "0.5px solid #4ade80" }}
                >
                  <ShieldOff size={12} />
                  {revertingUid === u.uid ? "Revertendo..." : "Reverter banimento/suspensão"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}