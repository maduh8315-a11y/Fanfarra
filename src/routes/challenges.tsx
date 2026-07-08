import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Target, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useMemo, useEffect } from "react";
import { useWorks } from "@/lib/fanfarra/store";
import {
  toggleChallenge,
  checkChallengeCompletion,
  useChallenges,
  type Challenge,
} from "@/lib/fanfarra/extras";

export const Route = createFileRoute("/challenges")({
  head: () => ({ meta: [{ title: "Desafios Fandom — Fanfarra" }] }),
  component: ChallengesPage,
});

function daysLeft(ts: number) {
  return Math.max(0, Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24)));
}

function ChallengesPage() {
  const nav = useNavigate();
  const challenges = useChallenges();
  const works = useWorks();

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

      <p className="px-4 text-[12px] mb-4" style={{ color: "var(--fan-text-2)" }}>
        Complete metas mensais e ganhe selos exclusivos.
      </p>

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
                    {completed && <CheckCircle2 size={14} color="var(--fan-pink)" />}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--fan-text-2)" }}>
                    {c.description}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <div
                  className="flex justify-between text-[10px] mb-1"
                  style={{ color: "var(--fan-text-3)" }}
                >
                  <span>
                    {done} / {c.target}
                  </span>
                  <span>{daysLeft(c.endsAt)}d restantes</span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--fan-border)" }}
                >
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
                className="w-full mt-3 py-2 rounded-[8px] text-[12px] font-bold"
                style={{
                  background: c.joined ? "transparent" : "var(--fan-pink)",
                  color: c.joined ? "var(--fan-pink-light)" : "#FFE6F0",
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
          <p className="text-[11px] mt-2" style={{ color: "var(--fan-text-2)" }}>
            Novos desafios todo mês
          </p>
        </div>
      </div>
    </AppShell>
  );
}
