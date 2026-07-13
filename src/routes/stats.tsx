// src/routes/stats.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { EmptyState } from "@/components/fanfarra/EmptyState";
import { ArrowLeft, Lock, TrendingUp, BarChart3 } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useWorks } from "@/lib/fanfarra/store";
import { useIsPro } from "@/lib/fanfarra/config";
import {
  IN_PROGRESS_STATUSES,
  WISHLIST_STATUSES,
  COMPLETED_STATUSES,
  type Work,
} from "@/lib/fanfarra/types";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Estatísticas Avançadas — Fanfarra" }] }),
  component: StatsPage,
});

// ─── Paleta fixa para gráficos ────────────────────────────────────────────
const PALETTE = [
  "#DC2626",
  "#F26B5E",
  "#C084FC",
  "#818CF8",
  "#34D399",
  "#FBBF24",
  "#F87171",
  "#38BDF8",
];

const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// ─── Cálculos ─────────────────────────────────────────────────────────────

function calcAdvancedStats(works: Work[]) {
  const typeCounts: Record<string, number> = {};
  works.forEach((w) => (typeCounts[w.type] = (typeCounts[w.type] ?? 0) + 1));
  const byType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const inProgress = works.filter((w) => (IN_PROGRESS_STATUSES as readonly string[]).includes(w.status)).length;
  const completed = works.filter((w) => (COMPLETED_STATUSES as readonly string[]).includes(w.status)).length;
  const wishlist = works.filter((w) => (WISHLIST_STATUSES as readonly string[]).includes(w.status)).length;
  const paused = works.filter((w) => w.status === "Pausado").length;
  const abandoned = works.filter((w) => w.status === "Abandonado").length;

  const byStatus = [
    { name: "Em andamento", value: inProgress },
    { name: "Concluídas", value: completed },
    { name: "Na fila", value: wishlist },
    { name: "Pausadas", value: paused },
    { name: "Abandonadas", value: abandoned },
  ].filter((s) => s.value > 0);

  const now = new Date();
  const monthly: { label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = works.filter((w) => {
      const u = new Date(w.updatedAt);
      return u.getFullYear() === d.getFullYear() && u.getMonth() === d.getMonth();
    }).length;
    monthly.push({ label: MONTH_LABELS[d.getMonth()], value: count });
  }

  const days: { date: string; count: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const count = works.filter((w) => new Date(w.updatedAt).toDateString() === key).length;
    days.push({ date: key, count });
  }

  const genreCounts: Record<string, number> = {};
  works.forEach((w) => w.genres?.forEach((g) => (genreCounts[g] = (genreCounts[g] ?? 0) + 1)));
  const totalGenreHits = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, pct: Math.round((count / totalGenreHits) * 100) }));

  const ratingCounts = [1, 2, 3, 4, 5].map((n) => ({
    label: `${n}★`,
    value: works.filter((w) => Math.round(w.rating) === n).length,
  }));

  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;
  const addedIn = (year: number) => works.filter((w) => new Date(w.createdAt).getFullYear() === year).length;
  const completedIn = (year: number) =>
    works.filter(
      (w) => (COMPLETED_STATUSES as readonly string[]).includes(w.status) && new Date(w.updatedAt).getFullYear() === year,
    ).length;

  const yearCompare = [
    { name: "Adicionadas", a: addedIn(lastYear), b: addedIn(thisYear) },
    { name: "Concluídas", a: completedIn(lastYear), b: completedIn(thisYear) },
  ];

  return { byType, byStatus, monthly, days, topGenres, ratingCounts, yearCompare, thisYear, lastYear };
}

// ─── Componentes de gráfico (SVG/CSS puro, sem libs externas) ────────────

function Donut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={150} height={150} viewBox="0 0 150 150">
        <g transform="rotate(-90 75 75)">
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * circumference;
            const el = (
              <circle
                key={d.name}
                cx={75}
                cy={75}
                r={radius}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={20}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offsetAcc}
              />
            );
            offsetAcc += dash;
            return el;
          })}
        </g>
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              style={{ width: 8, height: 8, borderRadius: 9999, background: PALETTE[i % PALETTE.length] }}
            />
            <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
              {d.name}
            </span>
            <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
              ({d.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBars({ data, color = "var(--fan-pink)" }: { data: { name: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <span className="text-sm w-24 truncate" style={{ color: "var(--fan-text-3)" }}>
            {d.name}
          </span>
          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--fan-tag)" }}>
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="text-sm w-6 text-right" style={{ color: "var(--fan-text-2)" }}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniLine({ data }: { data: { label: string; value: number }[] }) {
  const w = 300,
    h = 120,
    pad = 10;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = (w - pad * 2) / (data.length - 1 || 1);
  const coords = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.value / max) * (h - pad * 2 - 14);
    return { x, y };
  });
  const points = coords.map((c) => `${c.x},${c.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={140}>
      <polyline points={points} fill="none" stroke="var(--fan-pink)" strokeWidth={2} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2.5} fill="var(--fan-pink-light)" />
      ))}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={i} x={coords[i].x} y={h - 1} fontSize={7} fill="var(--fan-text-2)" textAnchor="middle">
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function VBars({ data, color = "var(--fan-pink-light)" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-3" style={{ height: 110 }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            {d.value}
          </span>
          <div style={{ width: "100%", height: `${(d.value / max) * 70}px`, background: color, borderRadius: 6 }} />
          <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function GroupedBars({
  data,
  labelA,
  labelB,
}: {
  data: { name: string; a: number; b: number }[];
  labelA: string;
  labelB: string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: "var(--fan-rose-mid)" }} />
          <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            {labelA}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: "var(--fan-pink)" }} />
          <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            {labelB}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.name}>
            <p className="text-sm mb-1" style={{ color: "var(--fan-text-3)" }}>
              {d.name}
            </p>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--fan-tag)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(d.a / max) * 100}%`, background: "var(--fan-rose-mid)" }}
                />
              </div>
              <span className="text-sm w-6 text-right" style={{ color: "var(--fan-text-2)" }}>
                {d.a}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--fan-tag)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(d.b / max) * 100}%`, background: "var(--fan-pink)" }}
                />
              </div>
              <span className="text-sm w-6 text-right" style={{ color: "var(--fan-text-2)" }}>
                {d.b}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const colorFor = (count: number) => {
    if (count === 0) return "var(--fan-tag)";
    const intensity = Math.min(1, count / max);
    if (intensity < 0.34) return "var(--fan-rose-mid)";
    if (intensity < 0.67) return "var(--fan-pink)";
    return "var(--fan-pink-light)";
  };
  return (
    <div className="flex flex-wrap gap-[3px]" style={{ maxWidth: 320 }}>
      {days.map((d, i) => (
        <div
          key={i}
          title={`${d.date}: ${d.count} atualização(ões)`}
          style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(d.count) }}
        />
      ))}
    </div>
  );
}

// ─── UI genérica ──────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[14px] p-4 mb-4"
      style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
    >
      <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--fan-text-2)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function ProGate({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  const nav = useNavigate();
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div style={{ filter: "blur(6px)", opacity: 0.5, pointerEvents: "none" }}>{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "var(--fan-active-chip)", border: "1px solid var(--fan-rose-mid)" }}
        >
          <Lock size={16} color="var(--fan-icon-blue)" />
        </div>
        <p className="text-sm text-center" style={{ color: "var(--fan-text)" }}>
          Gráfico exclusivo PRO
        </p>
        <button
          onClick={() => nav({ to: "/pro" })}
          className="text-sm font-bold px-4 py-2 rounded-full text-white"
          style={{ background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))" }}
        >
          Desbloquear PRO
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex-1 rounded-[12px] p-3 min-w-0"
      style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
    >
      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--fan-text-2)" }}>
        {label}
      </p>
      <p className="text-[18px] font-bold" style={{ color: "var(--fan-text)" }}>
        {value}
      </p>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────

function StatsPage() {
  const nav = useNavigate();
  const works = useWorks();
  const isPro = useIsPro();
  const s = useMemo(() => calcAdvancedStats(works), [works]);

  const total = works.length;
  const completed = works.filter((w) => (COMPLETED_STATUSES as readonly string[]).includes(w.status)).length;
  const inProgress = works.filter((w) => (IN_PROGRESS_STATUSES as readonly string[]).includes(w.status)).length;
  const wishlist = works.filter((w) => (WISHLIST_STATUSES as readonly string[]).includes(w.status)).length;

  if (total === 0) {
    return (
      <AppShell>
        <header className="flex items-center justify-between px-4 pt-4 pb-3">
          <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
            <ArrowLeft size={22} color="var(--fan-text-2)" />
          </button>
          <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
            Estatísticas Avançadas
          </h1>
          <span className="w-6" />
        </header>
       <EmptyState
          icon={BarChart3}
          iconColor="var(--fan-icon-blue)"
          title="Adicione obras à sua biblioteca para ver suas estatísticas aqui."
        />
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
          Estatísticas Avançadas
        </h1>
        <span className="w-6" />
      </header>

      <div className="px-4 pb-8">
        <div className="grid grid-cols-4 gap-2 mb-5">
          <SummaryCard label="Total" value={total} />
          <SummaryCard label="Concluídas" value={completed} />
          <SummaryCard label="Em andamento" value={inProgress} />
          <SummaryCard label="Na fila" value={wishlist} />
        </div>

        <Card title="Distribuição por tipo de mídia">
          <Donut data={s.byType} />
        </Card>

        <Card title="Obras por status">
          <HBars data={s.byStatus} />
        </Card>

        <div className="flex items-center gap-2 mt-6 mb-3">
          <Lock size={12} color="var(--fan-icon-blue)" />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--fan-pink-light)" }}>
            Gráficos avançados — PRO
          </p>
        </div>

        <ProGate locked={!isPro}>
          <Card title="Atividade nos últimos 12 meses">
            <MiniLine data={s.monthly} />
          </Card>
        </ProGate>

        <ProGate locked={!isPro}>
          <Card title="Mapa de atividade (últimos 90 dias)">
            <Heatmap days={s.days} />
          </Card>
        </ProGate>

        <ProGate locked={!isPro}>
          <Card title="Seus gêneros favoritos">
            {s.topGenres.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                Nenhum gênero registrado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {s.topGenres.map((g, i) => (
                  <div key={g.name} className="flex items-center gap-2">
                    <span className="text-sm w-24 truncate" style={{ color: "var(--fan-text-3)" }}>
                      {g.name}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--fan-tag)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${g.pct}%`, background: PALETTE[i % PALETTE.length] }}
                      />
                    </div>
                    <span className="text-sm w-8 text-right" style={{ color: "var(--fan-text-2)" }}>
                      {g.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </ProGate>

        <ProGate locked={!isPro}>
          <Card title="Distribuição de notas">
            <VBars data={s.ratingCounts} />
          </Card>
        </ProGate>

        <ProGate locked={!isPro}>
          <Card title={`Comparativo ${s.lastYear} × ${s.thisYear}`}>
            <GroupedBars data={s.yearCompare} labelA={String(s.lastYear)} labelB={String(s.thisYear)} />
          </Card>
        </ProGate>

        {!isPro && (
          <Link
            to="/pro"
            className="fan-btn-primary flex items-center justify-center gap-2 w-full mt-2"
            style={{ height: 48, fontSize: 13 }}
          >
            <TrendingUp size={16} color="white" />
            Ver planos PRO
          </Link>
        )}
      </div>
    </AppShell>
  );
}