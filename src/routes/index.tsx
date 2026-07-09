import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  tickStreak,
  checkAutoNotifications,
  syncEarnedBadges,
  useAppDataReady,
  useProfile,
  useSettings,
  useNotifications,
} from "@/lib/fanfarra/extras";
import {
  Bell,
  User,
  Sparkles,
  Search as SearchIcon,
  Plus,
  Library,
  Wand2,
  BookOpen,
  Tv,
  Gamepad2,
  BookMarked,
  FileText,
  Film,
  Globe,
  BookText,
  Clock,
  Joystick,
  ScrollText,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { TypeChips, type TypeFilter } from "@/components/fanfarra/Chips";
import { WorkCard } from "@/components/fanfarra/WorkCard";
import { useWorks } from "@/lib/fanfarra/store";
import { useAuthUser } from "@/lib/fanfarra/auth";
import { COMPLETED_STATUSES, IN_PROGRESS_STATUSES, WISHLIST_STATUSES } from "@/lib/fanfarra/types";
import type { Work } from "@/lib/fanfarra/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fanfarra — Seu universo fandom" },
      {
        name: "description",
        content: "Acompanhe animes, mangás, fanfics, livros, jogos e mais em um só lugar.",
      },
    ],
  }),
  component: Index,
});

const MEDIA_ICONS = [
  { icon: Tv, label: "Anime" },
  { icon: BookOpen, label: "Manga" },
  { icon: BookMarked, label: "Light Novel" },
  { icon: Gamepad2, label: "Jogo" },
  { icon: Film, label: "Filme" },
  { icon: FileText, label: "Fanfic" },
  { icon: Globe, label: "Webtoon" },
];

// ─── Helpers de cálculo ─────────────────────────────────────────────────────

function isThisMonth(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function calcStats(works: Work[]) {
  let totalWords = 0,
    monthWords = 0;
  let totalWatchH = 0,
    monthWatchH = 0;
  let totalGameH = 0,
    monthGameH = 0;
  let totalPages = 0,
    monthPages = 0;

  for (const w of works) {
    const d = w.details ?? {};
    const upd = w.updatedAt;

    // Palavras lidas — Fanfic, Light Novel, Livro
    if (w.type === "Fanfic" || w.type === "Light Novel" || w.type === "Livro") {
      const wc = Number(d.wordCount) || 0;
      totalWords += wc;
      if (isThisMonth(upd)) monthWords += wc;
    }

    // Horas assistidas — Anime, Série, Donghua, Dorama (episodeDuration × episódios)
    if (w.type === "Anime" || w.type === "Série" || w.type === "Donghua" || w.type === "Dorama") {
      const dur = d.episodeDuration as
        | { hours?: number; minutes?: number; seconds?: number }
        | undefined;
      const eps = Number(d.episode) || 0;
      if (dur && eps) {
        const secsPerEp = (dur.hours ?? 0) * 3600 + (dur.minutes ?? 24) * 60 + (dur.seconds ?? 0);
        const h = (eps * secsPerEp) / 3600;
        totalWatchH += h;
        if (isThisMonth(upd)) monthWatchH += h;
      }
    }
    // Filme (watchedMin)
    if (w.type === "Filme") {
      const min = Number(d.watchedMin) || 0;
      const h = min / 60;
      totalWatchH += h;
      if (isThisMonth(upd)) monthWatchH += h;
    }

    // Horas jogadas — Jogo
    if (w.type === "Jogo") {
      const h = Number(d.hours) || 0;
      totalGameH += h;
      if (isThisMonth(upd)) monthGameH += h;
    }

    // Páginas lidas — Livro, Manga, Manhwa, Manhua, HQ
    if (["Livro", "Manga", "Manhwa", "Manhua", "HQ"].includes(w.type)) {
      const pg = Number(d.page ?? d.chapter ?? d.issue) || 0;
      totalPages += pg;
      if (isThisMonth(upd)) monthPages += pg;
    }
  }

  return {
    totalWords,
    monthWords,
    totalWatchH,
    monthWatchH,
    totalGameH,
    monthGameH,
    totalPages,
    monthPages,
  };
}

function fmt(n: number, decimals = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals > 0 ? decimals : 0)}k`;
  return n.toFixed(decimals);
}

function fmtH(h: number) {
  if (h < 1) return `${Math.round(h * 60)}min`;
  return `${h.toFixed(1).replace(".", ",")}h`;
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  total,
  month,
  color = "var(--fan-pink-light)",
}: {
  icon: React.ElementType;
  label: string;
  total: string;
  month: string;
  color?: string;
}) {
  return (
    <div
      className="flex-1 rounded-[12px] p-3 flex flex-col gap-1 min-w-0"
      style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={12} color={color} />
        <span
          className="text-[9px] font-bold uppercase tracking-wide truncate"
          style={{ color: "var(--fan-text-2)" }}
        >
          {label}
        </span>
      </div>
      <span className="text-[15px] font-bold" style={{ color: "var(--fan-pink)" }}>
        {total}
      </span>
      <span className="text-[9px]" style={{ color: "var(--fan-text-2)" }}>
        <span style={{ color: color }}>{month}</span> este mês
      </span>
    </div>
  );
}

function StatsSection({ works }: { works: Work[] }) {
  const s = useMemo(() => calcStats(works), [works]);
  if (works.length === 0) return null;

  const hasWords = s.totalWords > 0;
  const hasWatch = s.totalWatchH > 0;
  const hasGame = s.totalGameH > 0;
  const hasPages = s.totalPages > 0;

  if (!hasWords && !hasWatch && !hasGame && !hasPages) return null;

  return (
    <div className="px-4 mt-5">
      <p
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: "var(--fan-text-2)" }}
      >
        Suas estatísticas
      </p>
      <div className="grid grid-cols-2 gap-2">
        {hasWords && (
          <StatCard
            icon={BookText}
            label="Palavras lidas"
            total={fmt(s.totalWords, 1)}
            month={fmt(s.monthWords, 1)}
            color="var(--fan-pink-light)"
          />
        )}
        {hasWatch && (
          <StatCard
            icon={Clock}
            label="Horas assistidas"
            total={fmtH(s.totalWatchH)}
            month={fmtH(s.monthWatchH)}
            color="#FF6BAE"
          />
        )}
        {hasGame && (
          <StatCard
            icon={Joystick}
            label="Horas jogadas"
            total={fmtH(s.totalGameH)}
            month={fmtH(s.monthGameH)}
            color="var(--fan-text-2)"
          />
        )}
       {hasPages && (
          <StatCard
            icon={ScrollText}
            label="Páginas lidas"
            total={fmt(s.totalPages)}
            month={fmt(s.monthPages)}
            color="var(--fan-pink-light)"
          />
        )}
      </div>
      <Link
        to="/stats"
        className="block text-center text-[11px] font-bold mt-3"
        style={{ color: "var(--fan-pink)" }}
      >
        Ver estatísticas avançadas →
      </Link>
    </div>
  );
}
function EmptyHome() {
  const user = useAuthUser();
  const name = user?.displayName?.split(" ")[0] ?? "fã";

  return (
    <div className="px-4 pb-6">
      <div className="mt-6 mb-8 text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--fan-bg-2), var(--fan-active-chip))",
            border: "1px solid var(--fan-rose-mid)",
          }}
        >
          <Sparkles size={28} color="var(--fan-pink-light)" fill="var(--fan-pink-light)" />
        </div>
        <h1 className="text-xl font-bold mb-1" style={{ color: "var(--fan-text)" }}>
          Olá, {name}! ✨
        </h1>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--fan-text-2)" }}>
          Sua biblioteca fandom começa aqui.{"\n"}Adicione a primeira obra e comece sua jornada!
        </p>
      </div>

      <Link
        to="/add"
        className="fan-btn-primary flex items-center justify-center gap-2 w-full mb-6"
        style={{ height: 52, fontSize: 15 }}
      >
        <Plus size={18} color="white" />
        Adicionar primeira obra
      </Link>

      <div
        className="rounded-[14px] p-4 mb-4"
        style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--fan-text-2)" }}
        >
          O que você pode registrar
        </p>
        <div className="grid grid-cols-4 gap-3">
          {MEDIA_ICONS.map(({ icon: Icon, label }) => (
            <Link key={label} to="/add" className="flex flex-col items-center gap-1.5">
              <div
                className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                style={{ background: "var(--fan-tag)", border: "0.5px solid var(--fan-border)" }}
              >
                <Icon size={20} color="var(--fan-pink-light)" />
              </div>
              <span className="text-[9px] text-center" style={{ color: "var(--fan-text-2)" }}>
                {label}
              </span>
            </Link>
          ))}
          <Link to="/add" className="flex flex-col items-center gap-1.5">
            <div
              className="w-12 h-12 rounded-[12px] flex items-center justify-center"
              style={{ background: "var(--fan-tag)", border: "0.5px dashed var(--fan-rose-mid)" }}
            >
              <span className="text-[10px] font-bold" style={{ color: "var(--fan-text-2)" }}>
                +6
              </span>
            </div>
            <span className="text-[9px] text-center" style={{ color: "var(--fan-text-2)" }}>
              e mais
            </span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/library"
          className="rounded-[14px] p-4 flex items-center gap-3"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
        >
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "var(--fan-tag)" }}
          >
            <Library size={18} color="var(--fan-pink-light)" />
          </div>
          <div>
            <p className="text-[12px] font-bold" style={{ color: "var(--fan-text)" }}>
              Biblioteca
            </p>
            <p className="text-[10px]" style={{ color: "var(--fan-text-2)" }}>
              Todas as obras
            </p>
          </div>
        </Link>
        <Link
          to="/recommendations"
          className="rounded-[14px] p-4 flex items-center gap-3"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
        >
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "var(--fan-tag)" }}
          >
            <Wand2 size={18} color="var(--fan-pink-light)" />
          </div>
          <div>
            <p className="text-[12px] font-bold" style={{ color: "var(--fan-text)" }}>
              Para você
            </p>
            <p className="text-[10px]" style={{ color: "var(--fan-text-2)" }}>
              Recomendações
            </p>
          </div>
        </Link>
      </div>

      <div
        className="mt-4 rounded-[14px] p-4 flex items-start gap-3"
        style={{
          background: "color-mix(in srgb, var(--fan-pink) 6%, transparent)",
          border: "0.5px solid color-mix(in srgb, var(--fan-pink) 20%, transparent)",
        }}
      >
        <Sparkles size={14} color="var(--fan-pink-light)" className="mt-0.5 shrink-0" />
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--fan-text-2)" }}>
          <span className="font-bold" style={{ color: "var(--fan-pink-light)" }}>
            Dica:{" "}
          </span>
          Você pode registrar seu progresso, dar notas, anotar pensamentos e acompanhar tudo em um
          só lugar.
        </p>
      </div>
    </div>
  );
}
function Index() {
  const works = useWorks();
  const profile = useProfile();
  const settings = useSettings();
  const notifications = useNotifications();
  const dataReady = useAppDataReady();
  const [filter, setFilter] = useState<TypeFilter>("Todos");

  useEffect(() => {
    if (!dataReady) return;
    tickStreak();
    checkAutoNotifications(works);
    const completed = works.filter((w) => w.status === "Concluído").length;
    const rated = works.filter((w) => w.rating > 0).length;
    syncEarnedBadges({
      total: works.length,
      completed,
      rated,
      streak: profile.streakDays,
      pro: settings.pro,
    });
  }, [works, profile.streakDays, settings.pro, dataReady]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = useMemo(
    () => (filter === "Todos" ? works : works.filter((w) => w.type === filter)),
    [works, filter],
  );

  const inProgress = filtered.filter((w) =>
    (IN_PROGRESS_STATUSES as readonly string[]).includes(w.status),
  );
  const featured = inProgress[0];
  const recent = [...inProgress].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10);
  const recentlyAdded = [...filtered].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  const wishlist = filtered
    .filter((w) => (WISHLIST_STATUSES as readonly string[]).includes(w.status))
    .slice(0, 10);
  const completed = filtered
    .filter((w) => (COMPLETED_STATUSES as readonly string[]).includes(w.status))
    .slice(0, 10);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles size={18} color="var(--fan-pink-light)" fill="var(--fan-pink-light)" />
          <span className="text-lg font-bold" style={{ color: "var(--fan-pink-light)" }}>
            Fanfarra
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/notifications" aria-label="Notificações" className="relative">
            <Bell size={18} color="var(--fan-text-2)" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-[3px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: "var(--fan-pink)" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/search" aria-label="Buscar">
            <SearchIcon size={18} color="var(--fan-text-2)" />
          </Link>
          <Link
            to="/profile"
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--fan-red-dark)" }}
            aria-label="Perfil"
          >
            <User size={14} color="var(--fan-pink-light)" />
          </Link>
        </div>
      </header>

      {works.length === 0 ? (
        <EmptyHome />
      ) : (
        <>
          <TypeChips value={filter} onChange={setFilter} />

          {/* Stats */}
          <StatsSection works={filtered} />

          {/* Featured banner */}
          {featured && (
            <Link
              to="/work/$id"
              params={{ id: featured.id }}
              className="block mx-4 mt-5 rounded-[14px] p-5 overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, var(--fan-bg-2) 0%, var(--fan-active-chip) 100%)",
                border: "0.5px solid var(--fan-rose-mid)",
              }}
            >
              <span
                className="inline-block text-[9px] font-bold px-2 py-1 rounded-full mb-3"
                style={{ background: "var(--fan-tag)", color: "var(--fan-pink-light)" }}
              >
                EM ANDAMENTO
              </span>
              <h2 className="text-base font-bold" style={{ color: "var(--fan-text)" }}>
                {featured.title}
              </h2>
              <p className="text-[11px] mt-1" style={{ color: "var(--fan-text-2)" }}>
                {featured.type === "Anime" ||
                  featured.type === "Série" ||
                  featured.type === "Donghua" ||
                  featured.type === "Dorama"
                  ? `Episódio ${featured.current} de ${featured.total}`
                  : featured.type === "Música"
                    ? `${featured.current} escutas`
                    : `Capítulo ${featured.current}${featured.total ? ` de ${featured.total}` : ""}`}
              </p>
              <div className="mt-4">
                <span className="fan-btn-primary inline-block text-[11px]">Continuar →</span>
              </div>
            </Link>
          )}

          <Section title="Recentemente atualizado" works={recent} />
          <Section title="Adicionadas recentemente" works={recentlyAdded} />
          <Section title="Quero consumir" works={wishlist} />
          <Section title="Concluídos recentemente" works={completed} />
        </>
      )}
    </AppShell>
  );
}

function Section({ title, works }: { title: string; works: ReturnType<typeof useWorks> }) {
  if (works.length === 0) return null;
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-[13px] font-bold" style={{ color: "var(--fan-text-3)" }}>
          {title}
        </h3>
        <Link to="/library" className="text-[10px]" style={{ color: "var(--fan-pink)" }}>
          Ver tudo
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        {works.map((w) => (
          <WorkCard key={w.id} work={w} />
        ))}
      </div>
    </section>
  );
}
