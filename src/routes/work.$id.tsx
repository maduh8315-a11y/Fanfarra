import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Star,
  BookOpen,
  Clock,
  Calendar,
  Hash,
  StickyNote,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { deleteWork, updateWork, useWork } from "@/lib/fanfarra/store";
import { postWorkAsRecommendation, removeRecommendationPost } from "@/lib/fanfarra/communityStore";
import { useProfile } from "@/lib/fanfarra/extras";
import { STATUS_COLORS } from "@/lib/fanfarra/types";

export const Route = createFileRoute("/work/$id")({
  component: WorkDetail,
});

function WorkDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const work = useWork(id);
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const [progressInput, setProgressInput] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  function togglePublicRec() {
    if (!work) return;
    const next = !work.isPublicRec;
    updateWork(work.id, {
      isPublicRec: next,
      recommendedBy: next ? profile.username : undefined,
    });
    if (next) {
      // Publica: passa a aparecer para todos os usuários em "Da comunidade"
      postWorkAsRecommendation(work, profile.username);
    } else {
      // Despublica: some da comunidade, mas a obra continua na biblioteca do usuário
      removeRecommendationPost(work.id);
    }
  }

  if (!work) {
    return (
      <AppShell>
        <div className="p-10 text-center" style={{ color: "var(--fan-text-2)" }}>
          Obra não encontrada.
        </div>
      </AppShell>
    );
  }

  const pct =
    work.total > 0
      ? Math.min(100, (work.current / work.total) * 100)
      : work.status === "Concluído"
        ? 100
        : 0;
  const sc = STATUS_COLORS[work.status];

  const progressLabel = () => {
    const unit =
      work.type === "Anime" ||
      work.type === "Série" ||
      work.type === "Donghua" ||
      work.type === "Dorama"
        ? "Ep."
        : work.type === "Livro"
          ? "Pág."
          : work.type === "Música"
            ? "Escutas:"
            : "Cap.";
    return `${unit} ${work.current}${work.total ? ` / ${work.total}` : ""}`;
  };

  return (
    <AppShell>
      {/* Hero com capa */}
      <div className="relative">
        {/* Fundo blur com capa ou cor sólida */}
        <div className="absolute inset-0 overflow-hidden" style={{ height: 220 }}>
          {work.cover ? (
            <img
              src={work.cover}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "blur(20px) brightness(0.3)", transform: "scale(1.1)" }}
            />
          ) : (
            <div
              style={{
                height: 220,
                background: "linear-gradient(180deg, var(--fan-bg-2) 0%, var(--fan-bg) 100%)",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(13,0,8,0.2) 0%, var(--fan-bg) 100%)" }}
          />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between px-4 pt-4 pb-3 z-10">
          <button
            onClick={() => nav({ to: "/" })}
            aria-label="Voltar"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(13,0,8,0.6)" }}
          >
            <ArrowLeft size={20} color="var(--fan-text-2)" />
          </button>
          <div className="flex items-center gap-2">
            <Link
              to="/work/$id/edit"
              params={{ id: work.id }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(13,0,8,0.6)" }}
            >
              <Pencil size={16} color="var(--fan-text-2)" />
            </Link>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(13,0,8,0.6)" }}
              onClick={() => {
                if (confirm(`Excluir "${work.title}"?`)) {
                  deleteWork(work.id);
                  nav({ to: "/library" });
                }
              }}
            >
              <Trash2 size={16} color="var(--fan-pink)" />
            </button>
          </div>
        </div>

        {/* Capa + título */}
        <div
          className="relative z-10 px-5 pt-2 pb-6 flex gap-4 items-end"
          style={{ minHeight: 160 }}
        >
          <div
            className="shrink-0 rounded-[12px] overflow-hidden shadow-xl"
            style={{
              width: 110,
              height: 155,
              background: "var(--fan-border)",
              border: "1px solid var(--fan-rose-mid)",
            }}
          >
            {work.cover ? (
              <img src={work.cover} alt={work.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MediaIcon type={work.type} size={40} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span
                className="text-[9px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: "var(--fan-tag)", color: "var(--fan-pink-light)" }}
              >
                {work.type}
              </span>
              <span
                className="text-[9px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: sc.bg, color: sc.fg }}
              >
                {work.status}
              </span>
            </div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: "var(--fan-text)" }}>
              {work.title}
            </h1>
            {/* Estrelas clicáveis */}
            <div className="flex gap-1 mt-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => updateWork(work.id, { rating: n })}
                  className="p-0.5"
                >
                  <Star
                    size={18}
                    color={(hoverRating || work.rating) >= n ? "var(--fan-pink-light)" : "var(--fan-rose-mid)"}
                    fill={(hoverRating || work.rating) >= n ? "var(--fan-pink-light)" : "transparent"}
                  />
                </button>
              ))}
              {work.rating > 0 && (
                <span
                  className="text-[11px] ml-1 self-center"
                  style={{ color: "var(--fan-text-2)" }}
                >
                  {work.rating}/5
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progresso */}
      <div className="px-5 -mt-2">
        <div
          className="rounded-[14px] p-4"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} color="var(--fan-pink-light)" />
              <span className="text-[11px] font-bold" style={{ color: "var(--fan-text-3)" }}>
                Progresso
              </span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: "var(--fan-pink)" }}>
              {Math.round(pct)}%
            </span>
          </div>
          <div
            className="h-[6px] rounded-full overflow-hidden"
            style={{ background: "var(--fan-border)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))" }}
            />
          </div>
          <p className="text-[11px] mt-2" style={{ color: "var(--fan-text-2)" }}>
            {progressLabel()}
          </p>

          {!editing ? (
            <button
              onClick={() => {
                setProgressInput(String(work.current));
                setEditing(true);
              }}
              className="fan-btn-primary mt-3 text-[12px] w-full flex items-center justify-center gap-1.5"
              style={{ height: 40 }}
            >
              <BookOpen size={14} color="white" />
              Atualizar progresso
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                value={progressInput}
                onChange={(e) => setProgressInput(e.target.value)}
                autoFocus
                className="flex-1 rounded-[10px] px-3 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--fan-bg)",
                  border: "1px solid var(--fan-pink)",
                  color: "var(--fan-text)",
                }}
              />
              <button
                onClick={() => {
                  updateWork(work.id, { current: parseInt(progressInput) || 0 });
                  setEditing(false);
                }}
                className="fan-btn-primary text-[12px] px-4"
                style={{ height: 42, borderRadius: 10 }}
              >
                Salvar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 rounded-[10px] text-[12px]"
                style={{
                  background: "var(--fan-bg)",
                  border: "0.5px solid var(--fan-rose-mid)",
                  color: "var(--fan-text-2)",
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Informações */}
      <section className="mt-4 px-5">
        <div
          className="rounded-[14px] overflow-hidden"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
        >
          <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
            <Hash size={12} color="var(--fan-text-2)" />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--fan-text-2)" }}
            >
              Informações
            </span>
          </div>
          <InfoRow icon={<BookOpen size={13} color="var(--fan-pink-light)" />} label="Tipo" value={work.type} />
          <InfoRow icon={<Clock size={13} color="var(--fan-pink-light)" />} label="Status" value={work.status} />
          <InfoRow
            icon={<TrendingUp size={13} color="var(--fan-pink-light)" />}
            label="Progresso"
            value={`${work.current}${work.total ? ` / ${work.total}` : ""}`}
          />
          <InfoRow
            icon={<Star size={13} color="var(--fan-pink-light)" />}
            label="Nota"
            value={work.rating ? `${work.rating}/5` : "—"}
          />
          <InfoRow
            icon={<Calendar size={13} color="var(--fan-pink-light)" />}
            label="Adicionada em"
            value={new Date(work.createdAt).toLocaleDateString("pt-BR")}
            last
          />
        </div>
      </section>

      {/* Notas */}
      {work.notes && (
        <section className="mt-4 px-5">
          <div
            className="rounded-[14px] p-4"
            style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <StickyNote size={12} color="var(--fan-text-2)" />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--fan-text-2)" }}
              >
                Minhas notas
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--fan-text-3)" }}>
              {work.notes}
            </p>
          </div>
        </section>
      )}

      {/* Recomendação pública — ao ativar, aparece para todos em "Da comunidade" */}
      <div
        className="mx-4 mt-4 mb-8 p-4 rounded-[14px] flex items-center justify-between"
        style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
      >
        <div>
          <p className="text-[13px] font-bold" style={{ color: "var(--fan-text)" }}>
            Recomendar publicamente
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--fan-text-2)" }}>
            {work.isPublicRec
              ? `Visível como @${profile.username}`
              : "Compartilhe com a comunidade Fanfarra"}
          </p>
        </div>
        <button
          onClick={togglePublicRec}
          className="w-11 h-6 rounded-full relative transition-all"
          style={{ background: work.isPublicRec ? "var(--fan-pink)" : "var(--fan-border)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
            style={{
              background: "#fff",
              left: work.isPublicRec ? "calc(100% - 22px)" : "2px",
            }}
          />
        </button>
      </div>
    </AppShell>
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
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[12px]" style={{ color: "var(--fan-text-2)" }}>
          {label}
        </span>
      </div>
      <span className="text-[12px] font-medium" style={{ color: "var(--fan-text-3)" }}>
        {value}
      </span>
    </div>
  );
}
