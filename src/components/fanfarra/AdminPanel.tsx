import { useState } from "react";
import { toast } from "sonner";
import { useIsAdmin } from "@/lib/fanfarra/config";
import { useAuthUser } from "@/lib/fanfarra/auth";
import { notifyAllUsers } from "@/lib/fanfarra/notify";
import {
  closeAwardsVoting,
  forceAdvanceAwardsPhase,
  setAwardsPhase,
  setPhaseDeadline,
  setPhaseOpen,
  startNewCycle,
  useAwardCategories,
  useAwardsConfig,
} from "@/lib/fanfarra/awardsStore";
import { triggerAwardsCron } from "@/lib/api/triggerCron.functions";
import { useEffect } from "react";
import { getImportHealthServer } from "@/lib/api/importHealth.functions";
import { auth } from "@/lib/fanfarra/firebase";
import { CheckCircle2, XCircle } from "lucide-react";

interface ImportHealthEntry {
  source: string;
  okCount?: number;
  failCount?: number;
  lastFailAt?: number;
  lastFailUrl?: string;
}

// ===== Painel admin (só visível pro UID em ADMIN_UIDS) =====
export function AdminPanel() {
  const user = useAuthUser();
  const categories = useAwardCategories();
  const config = useAwardsConfig();
  const [broadcastText, setBroadcastText] = useState("");

  const [recomendacaoOpenInput, setRecomendacaoOpenInput] = useState("");
  const [recomendacaoInput, setRecomendacaoInput] = useState("");
  const [novaEdicaoInput, setNovaEdicaoInput] = useState("");
  const [indicacaoOpenInput, setIndicacaoOpenInput] = useState("");
  const [indicacaoInput, setIndicacaoInput] = useState("");
  const [finalOpenInput, setFinalOpenInput] = useState("");
  const [finalInput, setFinalInput] = useState("");
  const [saving, setSaving] = useState<null | string>(null);

  const [importHealth, setImportHealth] = useState<ImportHealthEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    currentUser
      .getIdToken()
      .then((idToken) => getImportHealthServer({ data: { idToken } }))
      .then((res) => {
        if (!cancelled && res.ok) setImportHealth(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Defesa extra: mesmo que a rota /admin já bloqueie quem não é admin,
  // o componente também se recusa a renderizar pra quem não é.
const isAdmin = useIsAdmin(user?.uid);
  if (!user || !isAdmin) return null;
  const toLocalInputValue = (ts?: number) => {
    if (!ts) return "";
    const d = new Date(ts - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };

  const handleSaveDeadline = async (phase: "recomendacao" | "indicacao" | "final", value: string) => {
    if (!value) {
      toast.error("Escolha uma data e hora.");
      return;
    }
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) {
      toast.error("Data inválida.");
      return;
    }
    setSaving(`close-${phase}`);
    try {
      await setPhaseDeadline(phase, ts);
      toast.success("Prazo de fechamento salvo!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveOpen = async (phase: "recomendacao" | "indicacao" | "final", value: string) => {
    if (!value) {
      toast.error("Escolha uma data e hora.");
      return;
    }
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) {
      toast.error("Data inválida.");
      return;
    }
    setSaving(`open-${phase}`);
    try {
      await setPhaseOpen(phase, ts);
      triggerAwardsCron().catch(() => {});
      toast.success("Data de abertura salva!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(null);
    }
  };

  const handleStartNewCycle = async () => {
    if (!novaEdicaoInput) {
      toast.error("Defina o prazo de fechamento de 'recomendacao' antes de iniciar uma nova edição.");
      return;
    }
    const ts = new Date(novaEdicaoInput).getTime();
    if (Number.isNaN(ts)) {
      toast.error("Data inválida.");
      return;
    }
    setSaving("novaEdicao");
    try {
      await startNewCycle(categories, ts);
      triggerAwardsCron().catch(() => {}); // dá a largada no cron; se falhar, a rede de segurança de 6h cobre
      toast.success("Nova edição iniciada — indicados e finalistas anteriores foram zerados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar.");
    } finally {
      setSaving(null);
    }
  };

  const handleForceAdvance = async () => {
    setSaving("forcar");
    try {
      await forceAdvanceAwardsPhase(categories);
      toast.success("Fase verificada/avançada manualmente.");
    } catch (err) {
      console.error("Erro ao forçar virada de fase:", err);
      toast.error(err instanceof Error ? err.message : "Não foi possível avançar a fase.");
    } finally {
      setSaving(null);
    }
  };

  const handleCloseVoting = async () => {
    setSaving("fechar");
    try {
      await closeAwardsVoting();
      toast.success("Votação fechada — os usuários agora veem a página de 'sem votação aberta'.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível fechar a votação.");
    } finally {
      setSaving(null);
    }
  };

 const handleReopenVoting = async () => {
    setSaving("reabrir");
    try {
      await setAwardsPhase("recomendacao");
      triggerAwardsCron().catch(() => {}); // reativa o workflow, caso esteja desligado
      toast.success("Votação reaberta na fase de recomendação.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reabrir.");
    } finally {
      setSaving(null);
    }
  };

  const rows: {
    key: "recomendacao" | "indicacao" | "final";
    label: string;
    openTs?: number;
    closeTs?: number;
    openValue: string;
    setOpenValue: (v: string) => void;
    closeValue: string;
    setCloseValue: (v: string) => void;
  }[] = [
    {
      key: "recomendacao",
      label: "Recomendação (fase 0 — reações no Para você)",
      openTs: config.recomendacaoOpen,
      closeTs: config.recomendacaoDeadline,
      openValue: recomendacaoOpenInput,
      setOpenValue: setRecomendacaoOpenInput,
      closeValue: recomendacaoInput,
      setCloseValue: setRecomendacaoInput,
    },
    {
      key: "indicacao",
      label: "Recomendações (10 obras)",
      openTs: config.indicacaoOpen,
      closeTs: config.indicacaoDeadline,
      openValue: indicacaoOpenInput,
      setOpenValue: setIndicacaoOpenInput,
      closeValue: indicacaoInput,
      setCloseValue: setIndicacaoInput,
    },
    {
      key: "final",
      label: "Classificados (finalistas)",
      openTs: config.finalOpen,
      closeTs: config.finalDeadline,
      openValue: finalOpenInput,
      setOpenValue: setFinalOpenInput,
      closeValue: finalInput,
      setCloseValue: setFinalInput,
    },
  ];

  return (
    <div className="mx-4 mb-4 rounded-[14px] p-4" style={{ background: "var(--fan-bg)", border: "1px dashed var(--fan-pink)" }}>
      <p className="text-sm font-bold mb-2" style={{ color: "var(--fan-pink-light)" }}>
        Painel admin — fase atual: {config.phase}
      </p>

      <p className="text-[11px] mb-3" style={{ color: "var(--fan-text-2)" }}>
        Defina abaixo, à mão, a abertura e o fechamento de cada fase. O app vira
        sozinho pra fase seguinte quando o relógio passa do horário de
        fechamento (ou clique em "Forçar verificação" pra pular na hora, sem
        esperar). Importante: a abertura precisa ser ANTES do fechamento.
      </p>

      {rows.map((row) => (
        <div key={row.key} className="mb-4 pb-3" style={{ borderBottom: "1px dashed var(--fan-rose-mid)" }}>
          <p className="text-[12px] font-bold mb-2" style={{ color: "var(--fan-text)" }}>
            {row.label}
          </p>

          <label className="text-[11px] block mb-1" style={{ color: "var(--fan-text-2)" }}>
            Abre em
            {row.openTs ? ` (atual: ${new Date(row.openTs).toLocaleString("pt-BR")})` : " (sem data definida)"}
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="datetime-local"
              value={row.openValue || toLocalInputValue(row.openTs)}
              onChange={(e) => row.setOpenValue(e.target.value)}
              className="flex-1 rounded-[8px] px-2 py-1 text-sm bg-transparent"
              style={{ border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
            />
            <button
              onClick={() => handleSaveOpen(row.key, row.openValue || toLocalInputValue(row.openTs))}
              disabled={saving === `open-${row.key}`}
              className="text-[11px] px-2 py-1 rounded-full shrink-0"
              style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
            >
              Salvar
            </button>
          </div>

          <label className="text-[11px] block mb-1" style={{ color: "var(--fan-text-2)" }}>
            Fecha em
            {row.closeTs ? ` (atual: ${new Date(row.closeTs).toLocaleString("pt-BR")})` : " (sem prazo definido)"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={row.closeValue || toLocalInputValue(row.closeTs)}
              onChange={(e) => row.setCloseValue(e.target.value)}
              className="flex-1 rounded-[8px] px-2 py-1 text-sm bg-transparent"
              style={{ border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
            />
            <button
              onClick={() => handleSaveDeadline(row.key, row.closeValue || toLocalInputValue(row.closeTs))}
              disabled={saving === `close-${row.key}`}
              className="text-[11px] px-2 py-1 rounded-full shrink-0"
              style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
            >
              Salvar
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={handleForceAdvance}
        disabled={saving === "forcar"}
        className="text-[11px] px-2 py-1 rounded-full"
        style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
      >
        Forçar verificação de fase agora
      </button>

      <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--fan-pink)" }}>
        <p className="text-sm font-bold mb-2" style={{ color: "var(--fan-pink-light)" }}>
          Fechar / reabrir votação
        </p>
        <p className="text-[11px] mb-2" style={{ color: "var(--fan-text-2)" }}>
          Fechar mostra pra todo mundo a página "não há votação aberta no momento". Não apaga prazos nem indicados — Reabrir volta pra fase de recomendação.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCloseVoting}
            disabled={saving === "fechar" || config.phase === "fechado"}
            className="text-[11px] px-2 py-1 rounded-full"
            style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
          >
            Fechar votação
          </button>
          <button
            onClick={handleReopenVoting}
            disabled={saving === "reabrir" || config.phase !== "fechado"}
            className="text-[11px] px-2 py-1 rounded-full"
            style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
          >
            Reabrir votação
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--fan-pink)" }}>
        <p className="text-sm font-bold mb-2" style={{ color: "var(--fan-pink-light)" }}>
          Iniciar nova edição do zero
        </p>
        <p className="text-[11px] mb-2" style={{ color: "var(--fan-text-2)" }}>
          Zera indicados/finalistas da edição anterior e reabre a fase
          "recomendacao" com o prazo de fechamento definido abaixo.
        </p>
        <label className="text-[11px] block mb-1" style={{ color: "var(--fan-text-2)" }}>
          Fecha as recomendações em
        </label>
        <input
          type="datetime-local"
          value={novaEdicaoInput}
          onChange={(e) => setNovaEdicaoInput(e.target.value)}
          className="w-full rounded-[8px] px-2 py-1 text-sm bg-transparent mb-2"
          style={{ border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
        />
        <button
          onClick={handleStartNewCycle}
          disabled={saving === "novaEdicao"}
          className="text-[11px] px-2 py-1 rounded-full"
          style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
        >
          Iniciar nova edição
        </button>
      </div>
      <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--fan-pink)" }}>
        <p className="text-sm font-bold mb-2" style={{ color: "var(--fan-pink-light)" }}>
          Enviar aviso para todo mundo
        </p>
        <p className="text-[11px] mb-2" style={{ color: "var(--fan-text-2)" }}>
          Vai como notificação pra todos os usuários do app. Use com moderação.
        </p>
        <textarea
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          placeholder="Ex: Manutenção programada hoje às 22h."
          className="w-full rounded-[8px] px-2 py-1 text-sm bg-transparent mb-2"
          style={{ border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
          rows={2}
        />
        <button
          onClick={async () => {
            if (!broadcastText.trim()) {
              toast.error("Escreva o texto do aviso.");
              return;
            }
            setSaving("broadcast");
            const res = await notifyAllUsers("award", broadcastText.trim());
            setSaving(null);
            if (res.ok) {
              toast.success(`Aviso enviado para ${res.sent ?? 0} usuários.`);
              setBroadcastText("");
            } else {
              toast.error(res.error ?? "Não foi possível enviar.");
            }
          }}
          disabled={saving === "broadcast"}
          className="text-[11px] px-2 py-1 rounded-full"
          style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
        >
          Enviar aviso
        </button>
      </div>

      <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--fan-pink)" }}>
        <p className="text-sm font-bold mb-2" style={{ color: "var(--fan-pink-light)" }}>
          Saúde dos importadores
        </p>
        <p className="text-[11px] mb-2" style={{ color: "var(--fan-text-2)" }}>
          Quando um site muda o layout, o leitor automático dele começa a falhar
          e aparece aqui. Se "Falhas" ficar sempre alto pra uma fonte, é sinal
          de que o parser dela precisa ser atualizado.
        </p>
        {importHealth.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
            Sem dados ainda.
          </p>
        ) : (
          importHealth.map((h) => (
            <div
              key={h.source}
              className="flex items-center justify-between mb-1 text-[11px]"
              style={{ color: "var(--fan-text)" }}
            >
              <span>{h.source}</span>
              <span
                className="flex items-center gap-1"
                style={{ color: (h.failCount ?? 0) > 0 ? "var(--fan-pink-light)" : "var(--fan-text-2)" }}
              >
                <CheckCircle2 size={12} /> {h.okCount ?? 0} · <XCircle size={12} /> {h.failCount ?? 0}
                {h.lastFailAt ? ` (última falha: ${new Date(h.lastFailAt).toLocaleString("pt-BR")})` : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}