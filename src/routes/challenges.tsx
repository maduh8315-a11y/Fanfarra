import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Target, CheckCircle2, Plus, X } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useMemo, useEffect, useState, useRef } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { toast } from "sonner";
import { useWorks } from "@/lib/fanfarra/store";
import {
  toggleChallenge,
  checkChallengeCompletion,
  useChallenges,
  type Challenge,
} from "@/lib/fanfarra/extras";
import { useGoals, addGoal, updateGoalProgress, deleteGoal } from "@/lib/fanfarra/goalsStore";

export const Route = createFileRoute("/challenges")({
  head: () => ({ meta: [{ title: "Desafios Fandom — Fanfarra" }] }),
  component: ChallengesPage,
});

function daysLeft(ts: number) {
  return Math.max(0, Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24)));
}

const TABS = [
  { id: "personal", label: "Metas pessoais" },
  { id: "app", label: "Desafios do app" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ChallengesPage() {
  const nav = useNavigate();
  const challenges = useChallenges();
  const works = useWorks();
  const goals = useGoals();
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [creatingGoal, setCreatingGoal] = useState(false);

  const [tab, setTab] = useState<TabId>("personal");
  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const prevIndexRef = useRef(tabIndex);
  const dir = tabIndex > prevIndexRef.current ? 1 : -1;
  prevIndexRef.current = tabIndex;

  const goTab = (id: TabId) => setTab(id);

  const handleDragEnd = (_e: any, info: PanInfo) => {
    if (info.offset.x < -60 && tabIndex < TABS.length - 1) {
      goTab(TABS[tabIndex + 1].id);
    } else if (info.offset.x > 60 && tabIndex > 0) {
      goTab(TABS[tabIndex - 1].id);
    }
  };

  const handleCreateGoal = async () => {
    const target = Number(newGoalTarget);
    if (!newGoalTitle.trim() || !target || target <= 0) {
      toast.error("Preencha um título e uma meta válida.");
      return;
    }
    setCreatingGoal(true);
    try {
      await addGoal(newGoalTitle, target);
      setNewGoalTitle("");
      setNewGoalTarget("");
      setNewGoalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar meta.");
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleUpdateProgress = async (id: string, next: number) => {
    try {
      await updateGoalProgress(id, next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar progresso.");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Excluir esta meta?")) return;
    try {
      await deleteGoal(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir meta.");
    }
  };

  const progressOf = useMemo(
    () => (c: Challenge) =>
      works.filter((w) => w.type === c.type && w.status === "Concluído").length,
    [works],
  );

  useEffect(() => {
    challenges.forEach((c) => {
      if (c.joined && !c.completed) {
        checkChallengeCompletion(c.id, progressOf(c));
      }
    });
  }, [works, challenges, progressOf]);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Desafios Fandom
        </h1>
        <span className="w-6" />
      </header>

      <p className="px-4 text-sm mb-4" style={{ color: "var(--fan-text-2)" }}>
        {tab === "personal"
          ? "Suas metas pessoais de leitura, progresso no seu ritmo."
          : "Complete metas mensais e ganhe selos exclusivos."}
      </p>

      {/* Seletor de abas deslizante */}
      <div className="px-4 mb-5">
        <div
          className="relative flex rounded-full p-1"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              className="relative flex-1 py-2.5 text-sm font-bold rounded-full transition-colors"
              style={{ color: tab === t.id ? "#fff" : "var(--fan-text-2)" }}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="challenges-tab-pill"
                  className="absolute inset-0 rounded-full -z-10"
                  style={{ background: "var(--fan-pink)" }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo deslizante das abas */}
      <motion.div
        className="relative overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={tab}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {tab === "personal" ? (
              <div className="px-4 mb-8">
                <div className="space-y-3">
                  {goals.map((g) => {
                    const pct = Math.min(100, Math.round((g.progress / g.target) * 100));
                    const completed = g.progress >= g.target;
                    return (
                      <div
                        key={g.id}
                        className="rounded-[12px] p-4"
                        style={{
                          background: "var(--fan-bg-2)",
                          border: `0.5px solid ${completed ? "var(--fan-pink)" : "var(--fan-rose-mid)"}`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{g.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-[14px] font-bold" style={{ color: "var(--fan-text)" }}>
                                {g.title}
                              </h3>
                              {completed && <CheckCircle2 size={14} color="var(--fan-gold)" />}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            aria-label="Excluir meta"
                            style={{ color: "var(--fan-text-3)" }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1" style={{ color: "var(--fan-text-3)" }}>
                            <span>{g.progress} / {g.target}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--fan-border)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))",
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleUpdateProgress(g.id, g.progress - 1)}
                            className="flex-1 py-2 rounded-[8px] text-sm font-bold"
                            style={{ background: "transparent", color: "var(--fan-pink-light)", border: "0.5px solid var(--fan-pink)" }}
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleUpdateProgress(g.id, g.progress + 1)}
                            className="flex-1 py-2 rounded-[8px] text-sm font-bold"
                            style={{ background: "var(--fan-pink)", color: "var(--fan-text)" }}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setNewGoalOpen(true)}
                    className="w-full py-3 rounded-[12px] text-sm font-bold flex items-center justify-center gap-1.5"
                    style={{ background: "var(--fan-bg-2)", border: "1px dashed var(--fan-border)", color: "var(--fan-text-3)" }}
                  >
                    <Plus size={16} /> Nova meta
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 space-y-3 pb-8">
                {challenges.map((c) => {
                  const done = progressOf(c);
                  const pct = Math.min(100, Math.round((done / c.target) * 100));
                  const completed = done >= c.target;
                  return (
                    <div
                      key={c.id}
                      className="rounded-[12px] p-4"
                      style={{
                        background: "var(--fan-bg-2)",
                        border: `0.5px solid ${completed ? "var(--fan-pink)" : "var(--fan-rose-mid)"}`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{c.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[14px] font-bold" style={{ color: "var(--fan-text)" }}>
                              {c.title}
                            </h3>
                            {completed && <CheckCircle2 size={14} color="var(--fan-gold)" />}
                          </div>
                          <p className="text-sm mt-0.5" style={{ color: "var(--fan-text-2)" }}>
                            {c.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1" style={{ color: "var(--fan-text-3)" }}>
                          <span>{done} / {c.target}</span>
                          <span>{daysLeft(c.endsAt)}d restantes</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--fan-border)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))",
                            }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => toggleChallenge(c.id)}
                        className="w-full mt-3 py-2 rounded-[8px] text-sm font-bold"
                        style={{
                          background: c.joined ? "transparent" : "var(--fan-pink)",
                          color: c.joined ? "var(--fan-pink-light)" : "var(--fan-text)",
                          border: c.joined ? "0.5px solid var(--fan-pink)" : "none",
                        }}
                      >
                        {c.joined ? "Participando ✓" : "Participar"}
                      </button>
                    </div>
                  );
                })}

                <div className="text-center pt-4">
                  <Target size={28} color="var(--fan-rose-mid)" className="mx-auto" />
                  <p className="text-sm mt-2" style={{ color: "var(--fan-text-2)" }}>
                    Novos desafios todo mês
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {newGoalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setNewGoalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl p-5 sm:rounded-2xl"
            style={{ background: "var(--fan-bg)", border: "1px solid var(--fan-border)" }}
          >
            <h2 className="mb-3 text-[15px] font-bold" style={{ color: "var(--fan-text)" }}>
              Nova meta pessoal
            </h2>
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="Ex: Ler 20 mangás em 2026"
              className="mb-3 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)", color: "var(--fan-text)" }}
            />
            <input
              type="number"
              min="1"
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(e.target.value)}
              placeholder="Meta (ex: 20)"
              className="mb-3 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)", color: "var(--fan-text)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNewGoalOpen(false)}
                className="flex-1 rounded-full py-2.5 text-sm font-bold"
                style={{ background: "var(--fan-active-chip)", color: "var(--fan-text-2)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGoal}
                disabled={creatingGoal}
                className="flex-1 rounded-full py-2.5 text-sm font-bold"
                style={{ background: "var(--fan-pink)", color: "#fff" }}
              >
                {creatingGoal ? "Criando..." : "Criar meta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}