import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useAuthReady, useAuthUser } from "@/lib/fanfarra/auth";
import { useIsAdmin } from "@/lib/fanfarra/config";
import { usePublicProfile } from "@/lib/fanfarra/publicProfiles";
import { suspendUser, unbanUser } from "@/lib/fanfarra/moderationActions";

export const Route = createFileRoute("/admin_/suspend/$uid")({
  head: () => ({ meta: [{ title: "Suspender usuário — Fanfarra" }] }),
  validateSearch: (search: Record<string, unknown>): { username?: string; back?: string } => ({
    username: typeof search.username === "string" ? search.username : undefined,
    back: typeof search.back === "string" ? search.back : undefined,
  }),
  component: SuspendPage,
});

type Unit = "minutes" | "hours" | "days";

function SuspendPage() {
  const { uid } = Route.useParams();
  const { username, back } = Route.useSearch();
  const nav = useNavigate();
  const router = useRouter();
  const user = useAuthUser();
  const authReady = useAuthReady();
  const isAdmin = useIsAdmin(user?.uid);

  const profile = usePublicProfile(uid) as
    | null
    | { username?: string; banned?: boolean; suspendedUntil?: number };

  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<Unit>("hours");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

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

  const minutesPerUnit: Record<Unit, number> = { minutes: 1, hours: 60, days: 1440 };
  const amountNum = Number(amount.replace(",", "."));
  const totalMinutes = Number.isFinite(amountNum) && amountNum > 0 ? amountNum * minutesPerUnit[unit] : 0;
  const previewDate = totalMinutes > 0 ? new Date(Date.now() + totalMinutes * 60 * 1000) : null;

  const displayName = username || profile?.username || uid;
  const currentlySuspended = !!profile?.suspendedUntil && profile.suspendedUntil > Date.now();
  const currentlyBanned = !!profile?.banned;

  const goBack = () => nav({ to: back ?? "/admin" });

  const handleSubmit = async () => {
    if (totalMinutes <= 0) {
      toast.error("Informe uma duração válida.");
      return;
    }
    setSaving(true);
    try {
      await suspendUser(uid, totalMinutes, reason.trim() || undefined);
      toast.success("Usuário suspenso.");
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível suspender o usuário.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async () => {
    if (!confirm("Reverter o banimento/suspensão desse usuário?")) return;
    setSaving(true);
    try {
      await unbanUser(uid);
      toast.success("Banimento/suspensão revertido(a).");
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reverter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={goBack} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Suspender usuário
        </h1>
        <span className="w-6" />
      </header>

      <div className="px-4 pb-10">
        <p className="text-sm mb-1" style={{ color: "var(--fan-text)" }}>
          Usuário: <span className="font-bold">@{displayName}</span>
        </p>

        {(currentlyBanned || currentlySuspended) && (
          <p className="text-[12px] mb-4" style={{ color: "#f5a623" }}>
            {currentlyBanned
              ? "Este usuário está banido permanentemente."
              : `Suspenso até ${new Date(profile!.suspendedUntil!).toLocaleString("pt-BR")}.`}
          </p>
        )}

        <label className="block text-sm font-bold mt-4 mb-1" style={{ color: "var(--fan-pink-light)" }}>
          Duração da suspensão
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24 px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)", color: "var(--fan-text)" }}
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)", color: "var(--fan-text)" }}
          >
            <option value="minutes">Minutos</option>
            <option value="hours">Horas</option>
            <option value="days">Dias</option>
          </select>
        </div>

        {previewDate && (
          <p className="text-[12px] mt-2" style={{ color: "var(--fan-text-2)" }}>
            Volta a poder usar a conta em: <span className="font-bold">{previewDate.toLocaleString("pt-BR")}</span>
          </p>
        )}

        <label className="block text-sm font-bold mt-4 mb-1" style={{ color: "var(--fan-pink-light)" }}>
          Motivo (opcional, fica no histórico)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm resize-y"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)", color: "var(--fan-text)" }}
        />

        <div className="flex flex-col gap-2 mt-5">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-bold"
            style={{ background: "transparent", color: "#f5a623", border: "0.5px solid #f5a623" }}
          >
            Suspender por {amount || "0"} {unit === "minutes" ? "minuto(s)" : unit === "hours" ? "hora(s)" : "dia(s)"}
          </button>

          {(currentlyBanned || currentlySuspended) && (
            <button
              onClick={handleRevert}
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-bold"
              style={{ background: "transparent", color: "#4ade80", border: "0.5px solid #4ade80" }}
            >
              Reverter banimento/suspensão agora
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}