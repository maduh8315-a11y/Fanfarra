import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Trophy,
  Tv,
  BookOpen,
  Smartphone,
  Film,
  Monitor,
  Gamepad2,
  Feather,
  Star,
  Heart,
  Check,
  Crown,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useAuthUser } from "@/lib/fanfarra/auth";
import {
  checkAndAdvanceAwardsPhase,
  confirmAwardVotes,
  forceAdvanceAwardsPhase,
  getAwardResults,
  setRecomendacaoDeadline,
  useAllConfirmedAwardVotes,
  useAwardCategories,
  useAwardConfirmed,
  useAwardsConfig,
  useAwardVotes,
  voteAward,
  type AwardCategory,
  type AwardResultRow,
  type AwardsConfig,
  type AwardsPhase,
} from "@/lib/fanfarra/awardsStore";
import { useRecommenderLeaderboard } from "@/lib/fanfarra/nominationsStore";

export const Route = createFileRoute("/awards")({
  head: () => ({ meta: [{ title: "Fanfarra Awards 2025" }] }),
  component: AwardsPage,
});

// ⚠️ Troque pelo seu UID (Console do Firebase → Authentication).
const ADMIN_UIDS = ["ikvASYa9kgQknCrZeiiupirGGef1"];

const ICONS: Record<string, LucideIcon> = {
  tv: Tv,
  "book-open": BookOpen,
  smartphone: Smartphone,
  film: Film,
  monitor: Monitor,
  "gamepad-2": Gamepad2,
  feather: Feather,
  star: Star,
  heart: Heart,
};

const PHASE_BADGE: Record<AwardsPhase, string> = {
  recomendacao: "Recomendações abertas",
  indicacao: "Votação dos indicados",
  final: "Votação final",
  resultado: "Resultado final",
};

const PHASE_TAB_LABEL: Record<AwardsPhase, string> = {
  recomendacao: "Recomendar",
  indicacao: "Votar indicados",
  final: "Votar final",
  resultado: "Resultado",
};

function AwardsPage() {
  const nav = useNavigate();
  const categories = useAwardCategories();
  const config = useAwardsConfig();
  const phase = config.phase;
  const [view, setView] = useState<"participar" | "leaderboard">("participar");

  useEffect(() => {
    if (categories.length === 0) return;
    checkAndAdvanceAwardsPhase(categories);
    const id = setInterval(() => checkAndAdvanceAwardsPhase(categories), 5 * 60_000);
    return () => clearInterval(id);
  }, [categories, phase]);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "#FFE6F0" }}>
          Fanfarra Awards
        </h1>
        <span className="w-6" />
      </header>

      <div className="px-5 pt-2 pb-5 text-center">
        <div className="flex justify-center mb-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "radial-gradient(circle, var(--fan-active-chip) 0%, var(--fan-bg-2) 70%)", border: "1px solid var(--fan-rose-mid)" }}
          >
            <Trophy size={30} color="var(--fan-pink-light)" />
          </div>
        </div>
        <h2 className="text-[22px] font-extrabold" style={{ color: "#FFE6F0" }}>
          {config.title}
        </h2>
        <p className="text-[13px] mt-1.5" style={{ color: "var(--fan-text-2)" }}>
          {phase === "recomendacao" && "Sugira obras e aplauda ou vaie as sugestões dos outros."}
          {phase === "indicacao" && "Vote nos 10 indicados de cada categoria — os 5 mais votados avançam."}
          {phase === "final" && "Vote nos 5 finalistas — quem tiver mais votos vence."}
          {phase === "resultado" && "Veja quem venceu em cada categoria."}
        </p>

        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setView("participar")}
            className="rounded-full px-4 py-1.5 text-[11px] font-bold"
            style={{
              background: view === "participar" ? "var(--fan-active-chip)" : "transparent",
              border: `1px solid ${view === "participar" ? "var(--fan-pink)" : "var(--fan-border)"}`,
              color: view === "participar" ? "var(--fan-pink-light)" : "var(--fan-text-2)",
            }}
          >
            {PHASE_TAB_LABEL[phase]}
          </button>
          <button
            onClick={() => setView("leaderboard")}
            className="rounded-full px-4 py-1.5 text-[11px] font-bold"
            style={{
              background: view === "leaderboard" ? "var(--fan-active-chip)" : "transparent",
              border: `1px solid ${view === "leaderboard" ? "var(--fan-pink)" : "var(--fan-border)"}`,
              color: view === "leaderboard" ? "var(--fan-pink-light)" : "var(--fan-text-2)",
            }}
          >
            Recomendadores
          </button>
        </div>

        <div className="flex justify-center mt-3">
          <span
            className="text-[11px] font-bold px-3.5 py-1 rounded-full"
            style={{ background: "var(--fan-active-chip)", border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
          >
            {PHASE_BADGE[phase]}
          </span>
        </div>
      </div>

      <AdminPanel categories={categories} config={config} />

      {categories.length === 0 ? (
        <div className="px-4 pb-10 text-center text-[13px]" style={{ color: "var(--fan-text-2)" }}>
          Carregando categorias do Awards...
        </div>
      ) : view === "leaderboard" ? (
        <LeaderboardView />
      ) : phase === "recomendacao" ? (
        <RecommendationPhase config={config} />
      ) : phase === "indicacao" ? (
        <VotingPhase categories={categories} phase="indicacao" />
      ) : phase === "final" ? (
        <VotingPhase categories={categories} phase="final" />
      ) : (
        <ResultsPhase categories={categories} />
      )}
    </AppShell>
  );
}

// ===== Fase 0 — Recomendações (baseada nas reações reais do app) =====

function RecommendationPhase({ config }: { config: AwardsConfig }) {
  const deadline = config.recomendacaoDeadline;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const countdown = deadline ? formatCountdown(deadline - now) : null;

  return (
    <div className="px-4 pb-10">
      <div
        className="rounded-[14px] p-4 text-center"
        style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
      >
        <p className="text-[13px]" style={{ color: "var(--fan-text-2)" }}>
          As indicações não são mais sugeridas manualmente aqui — elas vêm direto das recomendações que
          a galera posta na tela{" "}
          <span style={{ color: "#FFE6F0", fontWeight: 700 }}>Para você</span>, ao longo do ano. 👏 e 👎
          contam pra valer!
        </p>
        {deadline ? (
          <p className="mt-3 text-[16px] font-extrabold" style={{ color: "var(--fan-pink-light)" }}>
            {countdown ? `Fecha em ${countdown}` : "Fechando as indicações..."}
          </p>
        ) : (
          <p className="mt-3 text-[12px]" style={{ color: "var(--fan-rose-mid)" }}>
            Data de corte ainda não configurada pelo time do Fanfarra.
          </p>
        )}
        <p className="mt-1 text-[10px]" style={{ color: "var(--fan-rose-mid)" }}>
          Quando bater a hora, as 10 obras mais aplaudidas de cada categoria viram indicadas a "Melhor", e
          as 10 mais vaiadas viram indicadas a "Pior" — reações depois disso não contam mais.
        </p>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string | null {
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}min`;
}


// ===== Leaderboard "melhores recomendadores" =====

function LeaderboardView() {
  const rows = useRecommenderLeaderboard();
  return (
    <div className="px-4 space-y-2 pb-10">
      <p className="text-[12px] text-center mb-2" style={{ color: "var(--fan-text-2)" }}>
        Ranking: nº de recomendações × taxa de aprovação (aplausos ÷ total de reações recebidas).
      </p>
      {rows.length === 0 && (
        <p className="text-center text-[12px]" style={{ color: "var(--fan-text-2)" }}>
          Ainda não há dados suficientes.
        </p>
      )}
      {rows.slice(0, 20).map((r, i) => (
        <div
          key={r.uid}
          className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
        >
          <span className="text-[12px] font-bold w-5 text-center" style={{ color: i < 3 ? "#FFD24D" : "var(--fan-text-2)" }}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: "#FFE6F0" }}>
              @{r.username}
            </div>
            <div className="text-[10px]" style={{ color: "var(--fan-text-2)" }}>
              {r.nominations} recomendações · {Math.round(r.approvalRate * 100)}% aprovação
            </div>
          </div>
          <span className="text-[12px] font-bold shrink-0" style={{ color: "var(--fan-pink-light)" }}>
            {r.score.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ===== Fase 1 e 2 — Votação (indicados / finalistas) =====

function VotingPhase({ categories, phase }: { categories: AwardCategory[]; phase: "indicacao" | "final" }) {
  const votes = useAwardVotes(phase);
  const { confirmed } = useAwardConfirmed(phase);
  const [confirming, setConfirming] = useState(false);

  const nomineesFor = (c: AwardCategory) => (phase === "final" ? c.finalists ?? c.nominees : c.nominees);

  const totalCategories = categories.length;
  const votedCount = categories.filter((c) => votes[c.id]).length;
  const allVoted = totalCategories > 0 && votedCount === totalCategories;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      confirmAwardVotes(phase);
      toast.success("Voto confirmado!");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="px-4 pb-10 space-y-3">
      {confirmed && (
        <div
          className="rounded-[12px] p-3 text-center text-[12px] font-bold flex items-center justify-center gap-1.5"
          style={{ background: "var(--fan-active-chip)", border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
        >
          <Check size={14} />
          Seus votos foram confirmados! Você ainda pode trocar até a virada de fase.
        </div>
      )}

      {categories.map((c) => {
        const nominees = nomineesFor(c);
        const Icon = ICONS[c.icon] ?? Star;
        const selected = votes[c.id];
        return (
          <div key={c.id} className="rounded-[14px] p-4" style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={16} color="var(--fan-pink-light)" />
              <span className="text-[13px] font-bold" style={{ color: "#FFE6F0" }}>
                {c.emoji} {c.name}
              </span>
            </div>
            {nominees.length === 0 ? (
              <p className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
                Nenhum indicado nesta categoria ainda.
              </p>
            ) : (
              <div className="space-y-1.5">
                {nominees.map((nominee) => {
                  const isSelected = selected === nominee;
                  return (
                    <button
                      key={nominee}
                      onClick={() => voteAward(phase, c.id, nominee)}
                      className="w-full flex items-center justify-between rounded-[10px] px-3 py-2 text-left text-[12px]"
                      style={{
                        background: isSelected ? "var(--fan-active-chip)" : "transparent",
                        border: `1px solid ${isSelected ? "var(--fan-pink)" : "var(--fan-border)"}`,
                        color: isSelected ? "var(--fan-pink-light)" : "#FFE6F0",
                      }}
                    >
                      <span>{nominee}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="sticky bottom-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={!allVoted || confirming}
          className="w-full rounded-full py-3 text-[13px] font-bold"
          style={{
            background: allVoted ? "var(--fan-pink)" : "var(--fan-bg-2)",
            color: allVoted ? "#1a0a12" : "var(--fan-text-2)",
            border: "1px solid var(--fan-rose-mid)",
          }}
        >
          {allVoted
            ? confirmed
              ? "Atualizar votos confirmados"
              : "Confirmar meus votos"
            : `Vote em todas as categorias (${votedCount}/${totalCategories})`}
        </button>
      </div>
    </div>
  );
}

// ===== Fase 3 — Resultado final =====

function ResultsPhase({ categories }: { categories: AwardCategory[] }) {
  const allVotes = useAllConfirmedAwardVotes("final");

  return (
    <div className="px-4 pb-10 space-y-3">
      <div className="flex items-center justify-center gap-1.5 mb-1 text-[11px]" style={{ color: "var(--fan-text-2)" }}>
        <Users size={13} />
        <span>{allVotes.length} voto(s) confirmado(s) na fase final</span>
      </div>
      {categories.map((c) => {
        const results: AwardResultRow[] = getAwardResults(c.id, allVotes);
        const winner = results[0];
        const Icon = ICONS[c.icon] ?? Star;
        return (
          <div key={c.id} className="rounded-[14px] p-4" style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} color="var(--fan-pink-light)" />
              <span className="text-[13px] font-bold" style={{ color: "#FFE6F0" }}>
                {c.emoji} {c.name}
              </span>
            </div>
            {!winner ? (
              <p className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
                Nenhum voto registrado nesta categoria.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={16} color="#FFD24D" />
                  <span className="text-[13px] font-extrabold" style={{ color: "#FFD24D" }}>
                    {winner.nominee}
                  </span>
                  <span className="text-[11px] ml-auto" style={{ color: "var(--fan-text-2)" }}>
                    {winner.count} voto(s) · {winner.pct}%
                  </span>
                </div>
                <div className="space-y-1">
                  {results.slice(1).map((r) => (
                    <div key={r.nominee} className="flex items-center justify-between text-[11px]" style={{ color: "var(--fan-text-2)" }}>
                      <span>{r.nominee}</span>
                      <span>{r.count} voto(s) · {r.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== Painel admin (só visível pro UID em ADMIN_UIDS) =====

function AdminPanel({ categories, config }: { categories: AwardCategory[]; config: AwardsConfig }) {
  const user = useAuthUser();
  const [days, setDays] = useState(7);
  if (!user || !ADMIN_UIDS.includes(user.uid)) return null;

  const handleStartCycle = async () => {
    const deadline = Date.now() + days * 24 * 60 * 60 * 1000;
    await setRecomendacaoDeadline(deadline);
    toast.success(`Nova edição iniciada — indicações fecham em ${days} dia(s).`);
  };

  const handleForceAdvance = async () => {
    await forceAdvanceAwardsPhase(categories);
    toast.success("Fase verificada/avançada manualmente.");
  };

  return (
    <div className="mx-4 mb-4 rounded-[14px] p-4" style={{ background: "var(--fan-bg)", border: "1px dashed var(--fan-pink)" }}>
      <p className="text-[11px] font-bold mb-2" style={{ color: "var(--fan-pink-light)" }}>
        Painel admin — fase atual: {config.phase}
      </p>
      {config.phase === "recomendacao" && (
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-16 rounded-[8px] px-2 py-1 text-[11px] bg-transparent"
            style={{ border: "1px solid var(--fan-rose-mid)", color: "#FFE6F0" }}
          />
          <button
            onClick={handleStartCycle}
            className="text-[10px] px-2 py-1 rounded-full"
            style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
          >
            Fechar indicações em N dia(s)
          </button>
        </div>
      )}
      <button
        onClick={handleForceAdvance}
        className="text-[10px] px-2 py-1 rounded-full"
        style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
      >
        ⚡ Forçar verificação de fase agora
      </button>
    </div>
  );
}