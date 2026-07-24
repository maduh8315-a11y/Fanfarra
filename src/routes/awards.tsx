
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useIsAdmin } from "@/lib/fanfarra/config";
import { useAuthUser } from "@/lib/fanfarra/auth";
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
import {
  checkAndAdvanceAwardsPhase,
  confirmAwardVotes,
  getAwardResults,
  useAllConfirmedAwardVotes,
  useAwardCategories,
  useAwardConfirmed,
  useAwardsConfig,
  useAwardVotes,
  voteAward,
  type AwardCategory,
  type AwardNomineeDetail,
  type AwardResultRow,
  type AwardsConfig,
  type AwardsPhase,
} from "@/lib/fanfarra/awardsStore";
import { useRecommenderLeaderboard } from "@/lib/fanfarra/nominationsStore";
import { AwardCrownBadge } from "@/components/fanfarra/AwardCrownBadge";


export const Route = createFileRoute("/awards")({
  head: () => ({ meta: [{ title: "Fanfarra Awards 2025" }] }),
  component: AwardsPage,
});




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

const AWARD_STEPS: { key: AwardsPhase; label: string }[] = [
  { key: "indicacao", label: "Recomendações" },
  { key: "final", label: "Classificados" },
  { key: "resultado", label: "Obra Premiada" },
];

function AwardsStepper({ phase }: { phase: AwardsPhase }) {
  // Enquanto phase === "recomendacao" (coleta ao longo do ano), nenhum passo
  // do stepper fica ativo ainda — a barra some/fica "neutra".
  const activeIndex = AWARD_STEPS.findIndex((s) => s.key === phase);

  return (
    <div className="flex items-center justify-center flex-wrap gap-1 px-2 mt-4">
      {AWARD_STEPS.map((step, i) => {
        const isDone = activeIndex > i;
        const isActive = activeIndex === i;
        return (
          <div key={step.key} className="flex items-center">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"
              style={{
                background: isActive ? "var(--fan-pink)" : isDone ? "var(--fan-active-chip)" : "transparent",
                border: `1px solid ${isActive || isDone ? "var(--fan-pink)" : "var(--fan-border)"}`,
                color: isActive ? "#1a0a12" : isDone ? "var(--fan-pink-light)" : "var(--fan-text-2)",
              }}
            >
              {isDone && <Check size={11} />}
              {step.label}
            </div>
            {i < AWARD_STEPS.length - 1 && (
              <div
                className="w-3 h-[2px] mx-0.5"
                style={{ background: isDone ? "var(--fan-pink)" : "var(--fan-border)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AwardsPage() {
  const nav = useNavigate();
  const categories = useAwardCategories();
  const config = useAwardsConfig();
  const phase = config.phase;
  const [view, setView] = useState<"participar" | "leaderboard">("participar");
  const authUser = useAuthUser();
  const isAdmin = useIsAdmin(authUser?.uid);

useEffect(() => {
    // Só o admin tenta essa "virada rápida" no navegador — ele é o único
    // que tem permissão de escrita em awards_config/awards_catalog pelas
    // rules. Pra todo mundo, quem garante a virada de fase é o GitHub
    // Actions (scripts/cron.mjs), que roda a cada 15 min com a Service
    // Account e ignora as rules. Sem esse "if", todo usuário comum tentava
    // escrever e caía em 403 a cada 15s (era o que estava no seu console).
    if (!isAdmin) return;
    if (categories.length === 0) return;
    const runCheck = () => {
      checkAndAdvanceAwardsPhase(categories).catch((err) =>
        console.error("Falha ao verificar/avançar fase do Awards:", err),
      );
    };
    runCheck();
    const id = setInterval(runCheck, 15_000); // checagem mais frequente
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, isAdmin]);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
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
            <Trophy size={30} color="var(--fan-icon-blue)" />
          </div>
        </div>
        <h2 className="fan-font-display text-[22px] font-extrabold" style={{ color: "var(--fan-text)" }}>
          {config.title}
        </h2>
        <p className="text-sm mt-1.5" style={{ color: "var(--fan-text-2)" }}>
          {phase === "recomendacao" && "Sugira obras e aplauda ou vaie as sugestões dos outros."}
          {phase === "indicacao" && "Vote nos 10 indicados de cada categoria — os 5 mais votados avançam."}
          {phase === "final" && "Vote nos 5 finalistas — quem tiver mais votos vence."}
          {phase === "resultado" && "Veja quem venceu em cada categoria."}
        </p>

        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setView("participar")}
            className="rounded-full px-4 py-1.5 text-sm font-bold"
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
            className="rounded-full px-4 py-1.5 text-sm font-bold"
            style={{
              background: view === "leaderboard" ? "var(--fan-active-chip)" : "transparent",
              border: `1px solid ${view === "leaderboard" ? "var(--fan-pink)" : "var(--fan-border)"}`,
              color: view === "leaderboard" ? "var(--fan-pink-light)" : "var(--fan-text-2)",
            }}
          >
            Recomendadores
          </button>
        </div>

        <AwardsStepper phase={phase} />
      </div>


      {categories.length === 0 ? (
        <div className="px-4 pb-10 text-center text-sm" style={{ color: "var(--fan-text-2)" }}>
          Carregando categorias do Awards...
        </div>
      ) : view === "leaderboard" ? (
        <LeaderboardView />
      ) : phase === "recomendacao" ? (
        <RecommendationPhase config={config} />
      ) : phase === "indicacao" ? (
        <VotingPhase categories={categories} phase="indicacao" config={config} />
      ) : phase === "final" ? (
        <VotingPhase categories={categories} phase="final" config={config} />
      ) : (
        <ResultsPhase categories={categories} config={config} />
      )}
    </AppShell>
  );
}

// ===== Fase 0 — Recomendações (baseada nas reações reais do app) =====

function RecommendationPhase({ config }: { config: AwardsConfig }) {
  const open = config.recomendacaoOpen;
  const deadline = config.recomendacaoDeadline;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const notOpenYet = !open || now < open;
  const openCountdown = open && notOpenYet ? formatCountdown(open - now) : null;
  const countdown = deadline ? formatCountdown(deadline - now) : null;

  return (
    <div className="px-4 pb-10">
      <div
        className="rounded-[14px] p-4 text-center"
        style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
      >
        <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
          As indicações não são mais sugeridas manualmente aqui — elas vêm direto das recomendações que
          a galera posta na tela{" "}
          <span style={{ color: "var(--fan-text)", fontWeight: 700 }}>Para você</span>, ao longo do ano. 👏 e 👎
          contam pra valer!
        </p>
        {notOpenYet && (
          <p className="mt-3 text-[16px] font-extrabold" style={{ color: "var(--fan-pink-light)" }}>
            {openCountdown
              ? `Abre em ${openCountdown}`
              : open
                ? "Prazo de abertura já passou!"
                : "Data de abertura ainda não agendada."}
          </p>
        )}
        {deadline ? (
          <p className="mt-3 text-[16px] font-extrabold" style={{ color: "var(--fan-pink-light)" }}>
            {countdown
              ? `Fecha em ${countdown}`
              : "Prazo encerrado!"}
          </p>
        ) : (
          <p className="mt-3 text-sm" style={{  color: "var(--fan-text-2)" }}>
            Data de corte ainda não configurada pelo time do Fanfarra.
          </p>
        )}
        <p className="mt-1 text-sm" style={{color: "var(--fan-text-2)" }}>
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
      <p className="text-sm text-center mb-2" style={{ color: "var(--fan-text-2)" }}>
        Ranking: nº de recomendações × taxa de aprovação (aplausos ÷ total de reações recebidas).
      </p>
      {rows.length === 0 && (
        <p className="text-center text-sm" style={{ color: "var(--fan-text-2)" }}>
          Ainda não há dados suficientes.
        </p>
      )}
      {rows.slice(0, 20).map((r, i) => (
        <div
          key={r.uid}
          className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
        >
          <span className="text-sm font-bold w-5 text-center" style={{ color: i < 3 ? "#FFD24D" : "var(--fan-text-2)" }}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: "var(--fan-text)" }}>
              @{r.username}
            </div>
            <div className="text-sm" style={{ color: "var(--fan-text-2)" }}>
              {r.nominations} recomendações · {Math.round(r.approvalRate * 100)}% aprovação
            </div>
          </div>
          <span className="text-sm font-bold shrink-0" style={{ color: "var(--fan-pink-light)" }}>
            {r.score.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ===== Fase 1 e 2 — Votação (indicados / finalistas) =====
function VotingPhase({
  categories,
  phase,
  config,
}: {
  categories: AwardCategory[];
  phase: "indicacao" | "final";
  config: AwardsConfig;
}) {
  const votes = useAwardVotes(phase);
  const { confirmed } = useAwardConfirmed(phase);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const open = phase === "indicacao" ? config.indicacaoOpen : config.finalOpen;
  const deadline = phase === "indicacao" ? config.indicacaoDeadline : config.finalDeadline;
  const notOpenYet = !open || now < open;
  const openCountdown = open && notOpenYet ? formatCountdown(open - now) : null;
  const closeCountdown = deadline ? formatCountdown(deadline - now) : null;

  const nomineesFor = (c: AwardCategory): AwardNomineeDetail[] => {
    const titles = phase === "final" ? c.finalists ?? c.nominees : c.nominees;
    const details = phase === "final" ? c.finalistDetails : c.nomineeDetails;
    const byTitle = new Map((details ?? []).map((d) => [d.title, d]));
    return titles.map((title) => byTitle.get(title) ?? { itemId: title, title, likes: 0, boos: 0 });
  };

 const votableCategories = categories.filter((c) => nomineesFor(c).length > 0);
  const totalCategories = votableCategories.length;
  const votedCount = votableCategories.filter((c) => votes[c.id]).length;
  const allVoted = totalCategories > 0 && votedCount === totalCategories;

const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirmAwardVotes(phase);
      toast.success("Voto confirmado!");
    } catch (err) {
      console.error("Erro ao confirmar votos:", err);
      toast.error(
        err instanceof Error ? err.message : "Não foi possível confirmar seus votos. Tente de novo.",
      );
    } finally {
      setConfirming(false);
    }
  };

  if (notOpenYet) {
    return (
      <div className="px-4 pb-10">
        <div
          className="rounded-[14px] p-4 text-center"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
        >
          <p className="text-[16px] font-extrabold" style={{ color: "var(--fan-pink-light)" }}>
            {openCountdown
              ? `Votação abre em ${openCountdown}`
              : open
                ? "Prazo de abertura já passou!"
                : "Data de abertura ainda não agendada."}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--fan-text-2)" }}>
            Volte quando abrir para votar nesta fase.
          </p>
        </div>
      </div>
    );
  }

  if (notOpenYet) {
    return (
      <div className="px-4 pb-10">
        <div
          className="rounded-[14px] p-4 text-center"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
        >
          <p className="text-[16px] font-extrabold" style={{ color: "var(--fan-pink-light)" }}>
            {openCountdown
              ? `Votação abre em ${openCountdown}`
              : open
                ? "Prazo de abertura já passou!"
                : "Data de abertura ainda não agendada."}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--fan-text-2)" }}>
            Volte quando abrir para votar nesta fase.
          </p>
        </div>
      </div>
    );
  }

  // ⬇️ ADICIONE ESTE BLOCO NOVO AQUI ⬇️
  const deadlinePassed = !!deadline && now >= deadline;
  if (deadlinePassed) {
    return (
      <div className="px-4 pb-10">
        <div
          className="rounded-[14px] p-4 text-center"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
        >
          <p className="text-[16px] font-extrabold" style={{ color: "var(--fan-pink-light)" }}>
            Prazo encerrado!
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--fan-text-2)" }}>
            Estamos apurando o resultado dessa fase. Isso costuma levar até 15
            minutos — assim que terminar, esta tela avança sozinha pra próxima
            etapa.
          </p>
        </div>
      </div>
    );
  }
  // ⬆️ FIM DO BLOCO NOVO ⬆️

  return (
    <div className="px-4 pb-10 space-y-3">
      {deadline ? (
        <p className="text-center text-sm font-bold" style={{ color: "var(--fan-pink-light)" }}>
          {closeCountdown
            ? `Fecha em ${closeCountdown}`
            : "Prazo encerrado!"}
        </p>
      ) : (
        <p className="text-center text-sm" style={{ color: "var(--fan-text-2)" }}>
          Data de corte ainda não configurada pelo time do Fanfarra.
        </p>
      )}

      {confirmed && (
        <div
          className="rounded-[12px] p-3 text-center text-sm font-bold flex items-center justify-center gap-1.5"
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
        const isPending = nominees.length > 0 && !selected;
        return (
          <div
            key={c.id}
            className="rounded-[14px] p-4"
            style={{
              background: "var(--fan-bg-2)",
              border: isPending ? "1.5px solid var(--fan-pink)" : "1px solid var(--fan-rose-mid)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon size={16} color="var(--fan-icon-blue)" />
                <span className="text-sm font-bold" style={{ color: "var(--fan-text)" }}>
                  {c.emoji} {c.name}
                </span>
              </div>
              {isPending && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)" }}
                >
                  Pendente
                </span>
              )}
            </div>
           {nominees.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                Ainda não teve aplausos/vaias suficientes nesta categoria para gerar indicados.
              </p>
            ) : (
              <div className="space-y-1.5">
                {nominees.map((nominee) => {
                  const isSelected = selected === nominee.title;
                  const hasDetail = nominee.itemId !== nominee.title;
                  return (
                    <div
                      key={nominee.itemId}
                      role="button"
                      tabIndex={0}
                      onClick={() => voteAward(phase, c.id, nominee.title)}
                      onKeyDown={(e) => e.key === "Enter" && voteAward(phase, c.id, nominee.title)}
                      className="w-full flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left cursor-pointer"
                      style={{
                        background: isSelected ? "var(--fan-active-chip)" : "transparent",
                        border: `1px solid ${isSelected ? "var(--fan-pink)" : "var(--fan-border)"}`,
                      }}
                    >
                     <div
                        className="relative w-9 h-12 rounded-[6px] overflow-hidden shrink-0 flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, var(--fan-bg-2), var(--fan-active-chip))",
                          border: "1px solid var(--fan-rose-mid)",
                        }}
                      >
                        <AwardCrownBadge title={nominee.title} />
                        {nominee.cover ? (
                          <img src={nominee.cover} alt={nominee.title} className="w-full h-full object-cover" />
                        ) : (
                          <Star size={14} color="var(--fan-icon-blue)" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold line-clamp-1"
                          style={{ color: isSelected ? "var(--fan-pink-light)" : "var(--fan-text)" }}
                        >
                          {nominee.title}
                        </p>
                        <p className="text-sm flex items-center gap-2" style={{ color: "var(--fan-text-2)" }}>
                          <span>👏 {nominee.likes}</span>
                          <span>👎 {nominee.boos}</span>
                        </p>
                      </div>

                      {hasDetail && (
                        <Link
                          to="/rec/$id"
                          params={{ id: nominee.itemId }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold shrink-0 px-2 py-1 rounded-full"
                          style={{ color: "var(--fan-pink-light)", border: "1px solid var(--fan-rose-mid)" }}
                        >
                          Ver obra
                        </Link>
                      )}

                      {isSelected && <Check size={14} color="var(--fan-pink-light)" />}
                    </div>
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
          className="w-full rounded-full py-3 text-sm font-bold"
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

function ResultsPhase({ categories, config }: { categories: AwardCategory[]; config: AwardsConfig }) {
  const rawVotes = useAllConfirmedAwardVotes("final");
  // mesmo princípio do freeze: votos confirmados depois do prazo final não
  // contam pro resultado, mesmo que a virada pra "resultado" demore a acontecer.
  const deadline = config.finalDeadline;
  const allVotes = deadline
    ? rawVotes.filter((v) => v.confirmedAt === undefined || v.confirmedAt <= deadline)
    : rawVotes;

  return (
    <div className="px-4 pb-10 space-y-3">
      <div className="flex items-center justify-center gap-1.5 mb-1 text-sm" style={{ color: "var(--fan-text-2)" }}>
        <Users size={13} />
        <span>{allVotes.length} voto(s) confirmado(s) na fase final</span>
      </div>
      {categories.map((c) => {
        const results: AwardResultRow[] = getAwardResults(c.id, allVotes);
        const winner = results[0];
        const winnerDetail = winner
          ? c.finalistDetails?.find((d) => d.title === winner.nominee)
          : undefined;
        const winnerHasDetail = !!winnerDetail && winnerDetail.itemId !== winnerDetail.title;
        const Icon = ICONS[c.icon] ?? Star;
        return (
          <div key={c.id} className="rounded-[14px] p-4" style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} color="var(--fan-icon-blue)" />
              <span className="text-sm font-bold" style={{ color: "var(--fan-text)" }}>
                {c.emoji} {c.name}
              </span>
            </div>
            {!winner ? (
              <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                Nenhum voto registrado nesta categoria.
              </p>
            ) : (
              <>
                <div
                  className="w-full flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 mb-2"
                  style={{ background: "var(--fan-active-chip)", border: "1px solid #FFD24D" }}
                >
                  <div
                    className="relative w-9 h-12 rounded-[6px] overflow-hidden shrink-0 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, var(--fan-bg-2), var(--fan-active-chip))",
                      border: "1px solid var(--fan-rose-mid)",
                    }}
                  >
                    {winnerDetail?.cover ? (
                      <img src={winnerDetail.cover} alt={winner.nominee} className="w-full h-full object-cover" />
                    ) : (
                      <Star size={14} color="var(--fan-icon-blue)" />
                    )}
                    <div
                      className="absolute -top-1.5 -right-1.5 rounded-full p-0.5 flex items-center justify-center"
                      style={{ background: "#FFD24D" }}
                    >
                      <Crown size={10} color="#1a0a12" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold line-clamp-1" style={{ color: "#FFD24D" }}>
                      {winner.nominee}
                    </p>
                    <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                      {winner.count} voto(s) · {winner.pct}%
                    </p>
                    <AwardCrownBadge title={winner.nominee} variant="inline" />
                  </div>

                  {winnerHasDetail && (
                    <Link
                      to="/rec/$id"
                      params={{ id: winnerDetail!.itemId }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-semibold shrink-0 px-2 py-1 rounded-full"
                      style={{ color: "#FFD24D", border: "1px solid #FFD24D" }}
                    >
                      Ver obra
                    </Link>
                  )}
                </div>
                <div className="space-y-1">
                  {results.slice(1).map((r) => (
                    <div key={r.nominee} className="flex items-center justify-between text-sm" style={{ color: "var(--fan-text-2)" }}>
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
