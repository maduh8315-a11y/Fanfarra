import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getTypeColor } from "@/lib/fanfarra/typeColors";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Star,
  Calendar,
  CalendarCheck,
  Clock,
  Hash,
  ExternalLink,
  User,
  Tag,
  ChevronRight,
  X,
  Check,
  StickyNote,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { AwardCrownBadge } from "@/components/fanfarra/AwardCrownBadge";
import { deleteWork, updateWork, useWork } from "@/lib/fanfarra/store";
import { postWorkAsRecommendation, removeRecommendationPost } from "@/lib/fanfarra/communityStore";
import { useProfile } from "@/lib/fanfarra/extras";
import { STATUS_COLORS } from "@/lib/fanfarra/types";

export const Route = createFileRoute("/work/$id")({
  component: WorkDetail,
});

/* ---------- helpers ---------- */
function formatDate(d?: { d?: number; m?: number; y?: number }) {
  if (!d?.y) return null;
  const dd = String(d.d ?? 1).padStart(2, "0");
  const mm = String(d.m ?? 1).padStart(2, "0");
  return `${dd}/${mm}/${d.y}`;
}

/* ---------- primitives ---------- */
const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  background: "var(--fan-bg-2)",
  border: "0.5px solid var(--fan-rose-mid)",
};

function Chip({
  children,
  bg = "var(--fan-tag)",
  fg = "var(--fan-pink-light)",
}: {
  children: React.ReactNode;
  bg?: string;
  fg?: string;
}) {
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5"
      style={{ background: bg, color: fg, border: "0.5px solid var(--fan-border)" }}
    >
      {children}
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: last ? "none" : "0.5px solid rgba(77,0,37,0.4)" }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: "var(--fan-pink-light)" }}>{icon}</span>
        <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
          {label}
        </span>
      </div>
      <span className="text-sm font-medium" style={{ color: "var(--fan-text)" }}>
        {value}
      </span>
    </div>
  );
}

/* ---------- main ---------- */
function WorkDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const work = useWork(id);
  const profile = useProfile();

  const [editingProgress, setEditingProgress] = useState(false);
  const [progressDraft, setProgressDraft] = useState("0");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const percent = useMemo(() => {
    if (!work) return 0;
    if (work.total > 0) return Math.min(100, Math.round((work.current / work.total) * 100));
    return work.status === "Concluído" ? 100 : 0;
  }, [work]);

  const daysSinceAdded = useMemo(
    () => (work ? Math.max(0, Math.floor((Date.now() - work.createdAt) / 86_400_000)) : 0),
    [work],
  );

  if (!work) {
    return (
      <AppShell>
        <div className="p-10 text-center" style={{ color: "var(--fan-text-2)" }}>
          Obra não encontrada.
        </div>
      </AppShell>
    );
  }

  const statusColor = STATUS_COLORS[work.status];

  const progressUnit =
    work.type === "Anime" || work.type === "Série" || work.type === "Donghua" || work.type === "Dorama"
      ? "Ep."
      : work.type === "Livro"
        ? "Pág."
        : work.type === "Música"
          ? "Escutas"
          : "Cap.";

  function togglePublicRec() {
    if (!work) return;
    const next = !work.isPublicRec;
    updateWork(work.id, {
      isPublicRec: next,
      recommendedBy: next ? profile.username : undefined,
    });
    if (next) {
      postWorkAsRecommendation(work, profile.username);
    } else {
      removeRecommendationPost(work.id);
    }
  }

  async function handleDeleteWork() {
    if (!work) return;
    setDeleting(true);
    try {
      await deleteWork(work.id);
      nav({ to: "/library" });
      return;
    } catch {
      // erro já mostrado via toast dentro de deleteWork
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <AppShell>
      {/* HERO */}
      <div className="relative" style={{ background: "var(--fan-bg-3)" }}>
        {work.cover && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${work.cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(24px) brightness(0.35)",
              transform: "scale(1.15)",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, var(--fan-bg) 100%)" }}
        />

        {/* Top actions */}
        <div className="relative flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => nav({ to: "/" })}
            className="p-2 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", color: "var(--fan-text)" }}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            <Link
              to="/work/$id/edit"
              params={{ id: work.id }}
              className="p-2 rounded-full"
              style={{ background: "rgba(0,0,0,0.5)", color: "var(--fan-text)" }}
              aria-label="Editar"
            >
              <Pencil size={18} />
            </Link>
            <button
              className="p-2 rounded-full"
              style={{ background: "rgba(0,0,0,0.5)", color: "var(--fan-pink)" }}
              aria-label="Excluir"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Cover + title */}
        <div className="relative px-5 pt-6 pb-8 flex gap-4">
          <div
            className="relative shrink-0 overflow-hidden"
            style={{
              width: 110,
              height: 155,
              borderRadius: 12,
              border: "0.5px solid var(--fan-rose-mid)",
              boxShadow: "0 12px 32px rgba(255,0,0,0.15)",
            }}
          >
            <AwardCrownBadge title={work.title} />
            {work.cover ? (
              <img src={work.cover} alt={work.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--fan-bg-2)" }}>
                <MediaIcon type={work.type} size={36} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col justify-end">
            <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--fan-text)" }}>
              {work.title}
            </h1>

            <div className="mt-2 flex flex-wrap gap-2">
              <Chip bg={`color-mix(in srgb, ${getTypeColor(work.type)} 18%, var(--fan-tag))`} fg={getTypeColor(work.type)}>
                <MediaIcon type={work.type} size={12} />
                {work.type}
              </Chip>
              <Chip bg={statusColor.bg} fg={statusColor.fg}>
                {work.status}
              </Chip>
            </div>

            {/* Rating */}
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= work.rating;
                return (
                  <button key={n} onClick={() => updateWork(work.id, { rating: n })} aria-label={`Avaliar ${n}`}>
                    <Star
                      size={20}
                      fill={active ? "var(--fan-pink)" : "transparent"}
                      color={active ? "var(--fan-pink)" : "var(--fan-text-2)"}
                    />
                  </button>
                );
              })}
              {work.rating > 0 && (
                <span className="text-sm ml-1" style={{ color: "var(--fan-text-2)" }}>
                  {work.rating}/5
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Genres chips */}
        {work.genres && work.genres.length > 0 && (
          <div className="relative px-5 pb-5 flex flex-wrap gap-2">
            {work.genres.map((g) => (
              <span
                key={g}
                className="px-2.5 py-1 rounded-full text-[11px]"
                style={{ background: "var(--fan-tag)", color: "var(--fan-pink-light)", border: "0.5px solid var(--fan-border)" }}
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div
        className="mx-5 my-6 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--fan-rose-mid), transparent)" }}
      />

      {/* PROGRESS */}
      <section className="px-5">
        <div style={cardStyle} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
              Progresso
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--fan-pink-light)" }}>
              {progressUnit} {work.current}
              {work.total ? ` / ${work.total}` : ""} • {percent}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--fan-bg-3)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full"
              style={{ background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))" }}
            />
          </div>

          {!editingProgress ? (
            <button
              onClick={() => {
                setProgressDraft(String(work.current));
                setEditingProgress(true);
              }}
              className="mt-4 w-full py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)", border: "0.5px solid var(--fan-rose-mid)" }}
            >
              Atualizar progresso
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={work.total || undefined}
                value={progressDraft}
                onChange={(e) => setProgressDraft(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--fan-bg-3)", border: "0.5px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
              />
              <button
                onClick={() => {
                  const raw = Number(progressDraft) || 0;
                  const n = work.total > 0 ? Math.max(0, Math.min(work.total, raw)) : Math.max(0, raw);
                  updateWork(work.id, { current: n });
                  setEditingProgress(false);
                }}
                className="p-2 rounded-lg"
                style={{ background: "var(--fan-pink)", color: "var(--fan-text)" }}
                aria-label="Salvar"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => setEditingProgress(false)}
                className="p-2 rounded-lg"
                style={{ background: "var(--fan-bg-3)", color: "var(--fan-text-2)", border: "0.5px solid var(--fan-rose-mid)" }}
                aria-label="Cancelar"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* MINI DASHBOARD */}
      <section className="px-5 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Progresso", value: `${percent}%` },
          { label: "Nota", value: work.rating ? `${work.rating}/5` : "—" },
          { label: "Dias", value: `${daysSinceAdded}d` },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            style={cardStyle}
            className="p-3 text-center"
          >
            <div className="text-lg font-bold" style={{ color: "var(--fan-pink-light)" }}>
              {s.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "var(--fan-text-2)" }}>
              {s.label}
            </div>
          </motion.div>
        ))}
      </section>

      {/* INFO */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="px-5 mt-6"
      >
        <h2 className="text-xs uppercase tracking-wider mb-2 px-1" style={{ color: "var(--fan-text-2)" }}>
          Informações
        </h2>
        <div style={cardStyle}>
          <InfoRow icon={<Hash size={16} />} label="Tipo" value={work.type} />
          <InfoRow icon={<Tag size={16} />} label="Status" value={work.status} />
          {formatDate(work.startDate) && (
            <InfoRow icon={<Calendar size={16} />} label="Início" value={formatDate(work.startDate)!} />
          )}
          {formatDate(work.endDate) && (
            <InfoRow icon={<CalendarCheck size={16} />} label="Fim" value={formatDate(work.endDate)!} />
          )}
          <InfoRow icon={<Clock size={16} />} label="Adicionado" value={`há ${daysSinceAdded} dia${daysSinceAdded === 1 ? "" : "s"}`} />
          {work.recommendedBy && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "0.5px solid rgba(77,0,37,0.4)" }}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: "var(--fan-pink-light)" }}>
                  <User size={16} />
                </span>
                <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                  Recomendado por
                </span>
              </div>
              <Link
                to="/u/$username"
                params={{ username: work.recommendedBy }}
                className="text-sm font-medium underline"
                style={{ color: "var(--fan-text)" }}
              >
                @{work.recommendedBy}
              </Link>
            </div>
          )}
          {work.link ? (
            <button
              onClick={() => window.open(work.link, "_blank", "noopener,noreferrer")}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span style={{ color: "var(--fan-icon-blue)" }}>
                  <ExternalLink size={16} />
                </span>
                <span className="text-sm" style={{ color: "var(--fan-text)" }}>
                  Ver na fonte
                </span>
              </div>
              <ChevronRight size={16} color="var(--fan-text-2)" />
            </button>
          ) : null}
        </div>
      </motion.section>

      {/* NOTES */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.4 }}
        className="px-5 mt-6"
      >
        <h2 className="text-xs uppercase tracking-wider mb-2 px-1" style={{ color: "var(--fan-text-2)" }}>
          Minhas notas
        </h2>
        <div style={cardStyle} className="p-4">
          {work.notes.trim() ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--fan-text-3)" }}>
              {work.notes}
            </p>
          ) : (
            <div className="text-center py-6 flex flex-col items-center gap-2">
              <div className="p-3 rounded-full" style={{ background: "var(--fan-bg-3)", border: "0.5px solid var(--fan-rose-mid)" }}>
                <StickyNote size={20} color="var(--fan-pink-light)" />
              </div>
              <div className="text-sm font-medium" style={{ color: "var(--fan-text)" }}>
                Ainda sem anotações
              </div>
              <div className="text-xs max-w-[240px]" style={{ color: "var(--fan-text-2)" }}>
                Registre o que você sentiu, cenas favoritas ou spoilers do seu eu do futuro.
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* PUBLIC REC TOGGLE */}
      <div className="mx-4 mt-6 mb-8">
        <div style={cardStyle} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-full shrink-0" style={{ background: "var(--fan-bg-3)", border: "0.5px solid var(--fan-rose-mid)" }}>
              <Sparkles size={16} color="var(--fan-pink-light)" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium" style={{ color: "var(--fan-text)" }}>
                Recomendar publicamente
              </div>
              <div className="text-xs" style={{ color: "var(--fan-text-2)" }}>
                {work.isPublicRec ? `Visível como @${profile.username}` : "Compartilhe com a comunidade Fanfarra"}
              </div>
            </div>
          </div>
          <button
            onClick={togglePublicRec}
            className="relative shrink-0 rounded-full transition-colors"
            style={{
              width: 44,
              height: 26,
              background: work.isPublicRec ? "var(--fan-pink)" : "var(--fan-bg-3)",
              border: "0.5px solid var(--fan-rose-mid)",
            }}
            aria-pressed={work.isPublicRec}
          >
            <span
              className="absolute top-0.5 rounded-full transition-all"
              style={{ width: 20, height: 20, background: "var(--fan-text)", left: work.isPublicRec ? 22 : 2 }}
            />
          </button>
        </div>
      </div>

      {/* DELETE BOTTOM SHEET */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-5"
            style={{
              background: "var(--fan-bg-2)",
              borderTop: "0.5px solid var(--fan-rose-mid)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--fan-rose-mid)" }} />
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full" style={{ background: "var(--fan-red-dark)" }}>
                <Trash2 size={18} color="var(--fan-pink)" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold" style={{ color: "var(--fan-text)" }}>
                  Excluir "{work.title}"?
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--fan-text-2)" }}>
                  Essa ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--fan-bg-3)", color: "var(--fan-text)", border: "0.5px solid var(--fan-rose-mid)" }}
              >
                Cancelar
              </button>
              <button
                disabled={deleting}
                onClick={handleDeleteWork}
                className="flex-1 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--fan-pink)", color: "var(--fan-text)" }}
              >
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}