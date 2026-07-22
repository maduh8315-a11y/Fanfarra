import { useIsAdmin } from "@/lib/fanfarra/config";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { MediaType } from "@/lib/fanfarra/types";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Star,
  Building2,
  Tag,
  MessageSquare,
  Heart,
  HeartCrack,
  Link as LinkIcon,
  Layers,
  Users2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/fanfarra/AppShell";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { AwardCrownBadge } from "@/components/fanfarra/AwardCrownBadge";
import {
  CATALOG,
  communityToRecommendationItem,
  type RecommendationItem,
} from "@/lib/fanfarra/recommendations";
import { usePublicRecommendations } from "@/lib/fanfarra/communityStore";
import { useRecReactionCounts, useMyRecReaction, reactToRecItem } from "@/lib/fanfarra/recReactions";
import type { RelatedWork } from "@/lib/fanfarra/formConfig";
import { useAuthUser } from "@/lib/fanfarra/auth";
import { useRecComments, postRecComment, deleteRecComment } from "@/lib/fanfarra/recComments";

export const Route = createFileRoute("/rec/$id")({
  component: RecDetail,
});



function buildTotals(item: RecommendationItem): string[] {
  const t: string[] = [];
  if (item.episodes) t.push(`${item.episodes} episódios`);
  if (item.chapters) t.push(`${item.chapters} capítulos`);
  if (item.volumes) t.push(`${item.volumes} volumes`);
  if (item.seasons) t.push(`${item.seasons} temporadas`);
  if (item.pages) t.push(`${item.pages} páginas`);
  if (item.issues) t.push(`${item.issues} issues`);
  if (item.hours) t.push(`~${item.hours}h jogadas`);
  if (item.words) t.push(`${item.words.toLocaleString("pt-BR")} palavras`);
  return t;
}
type FichaFieldKey = "total" | "duration" | "studio" | "platform" | "fandom" | "status";

interface FichaField {
  key: FichaFieldKey;
  label?: string;
}

const FICHA_TECNICA_CONFIG: Record<string, FichaField[]> = {
  Anime: [
    { key: "total" },
    { key: "duration", label: "Duração dos episódios" },
    { key: "studio", label: "Estúdio" },
    { key: "platform" },
    { key: "status" },
  ],
  Donghua: [
    { key: "total" },
    { key: "duration", label: "Duração dos episódios" },
    { key: "studio", label: "Estúdio" },
    { key: "platform" },
    { key: "status" },
  ],
  Série: [
    { key: "total" },
    { key: "duration", label: "Duração dos episódios" },
    { key: "platform" },
    { key: "status" },
  ],
  Dorama: [
    { key: "total" },
    { key: "duration", label: "Duração dos episódios" },
    { key: "platform" },
    { key: "status" },
  ],
  Filme: [
    { key: "duration", label: "Duração" },
    { key: "studio", label: "Produtora" },
    { key: "platform" },
    { key: "status" },
  ],
  Manga: [{ key: "total" }, { key: "platform", label: "Onde ler" }, { key: "status" }],
  Manhwa: [{ key: "total" }, { key: "platform", label: "Onde ler" }, { key: "status" }],
  Manhua: [{ key: "total" }, { key: "platform", label: "Onde ler" }, { key: "status" }],
  Webtoon: [{ key: "total" }, { key: "platform", label: "Onde ler" }, { key: "status" }],
  HQ: [
    { key: "total" },
    { key: "studio", label: "Editora" },
    { key: "platform", label: "Onde ler" },
    { key: "status" },
  ],
  Livro: [
    { key: "total" },
    { key: "studio", label: "Editora" },
    { key: "platform", label: "Onde encontrar" },
    { key: "status" },
  ],
  "Light Novel": [
    { key: "total" },
    { key: "studio", label: "Editora" },
    { key: "platform", label: "Onde encontrar" },
    { key: "status" },
  ],
  Fanfic: [
    { key: "total" },
    { key: "fandom" },
    { key: "platform", label: "Site" },
    { key: "status" },
  ],
  Jogo: [
    { key: "total" },
    { key: "studio", label: "Desenvolvedora" },
    { key: "platform" },
    { key: "status" },
  ],
  Música: [{ key: "duration", label: "Duração" }, { key: "platform" }, { key: "status" }],
};

const FICHA_LABELS: Record<FichaFieldKey, string> = {
  total: "Total",
  duration: "Duração",
  studio: "Estúdio",
  platform: "Plataforma",
  fandom: "Fandom",
  status: "Status",
};

function getFichaValue(
  item: RecommendationItem,
  totals: string[],
  key: FichaFieldKey,
): string | undefined {
  switch (key) {
    case "total":
      return totals.length ? totals.join(" · ") : undefined;
    case "duration":
      return item.duration ? `${item.duration} min` : undefined;
    case "studio":
      return item.studio;
    case "platform":
      return item.platform;
    case "fandom":
      return item.fandom;
    case "status":
      return item.status;
    default:
      return undefined;
  }
}

function RecDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const community = usePublicRecommendations();


  const item: RecommendationItem | null = useMemo(() => {
    if (id.startsWith("community_")) {
      const originalId = id.replace("community_", "");
      const rec = community.find((r) => r.id === originalId);
      return rec ? communityToRecommendationItem(rec) : null;
    }
    return CATALOG.find((c) => c.id === id) ?? null;
  }, [id, community]);

  const reactionCounts = useRecReactionCounts(item?.id ?? "");
  const myReaction = useMyRecReaction(item?.id ?? "");

  const user = useAuthUser();
  const isAdmin = useIsAdmin(user?.uid);
 const { comments, hasMore: hasMoreComments, loadingMore: loadingMoreComments, loadMore: loadMoreComments } =
  useRecComments(item?.id ?? "");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePostComment = async () => {
    if (!item) return;
    setPosting(true);
    try {
      await postRecComment(item.id, user?.displayName || "Usuário", commentText);
      setCommentText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível comentar.");
    } finally {
      setPosting(false);
    }
  };

  const [confirmDeleteComment, setConfirmDeleteComment] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const handleDeleteComment = async (commentId: string) => {
    setDeletingComment(true);
    try {
      await deleteRecComment(commentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível apagar.");
    } finally {
      setDeletingComment(false);
      setConfirmDeleteComment(null);
    }
  };

 const [reacting, setReacting] = useState(false);

  const handleReact = async (reaction: "like" | "boo") => {
    if (!item || reacting) return;
    setReacting(true);
    try {
      await reactToRecItem(item.id, reaction, item.type);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reagir agora.");
    } finally {
      setReacting(false);
    }
  };

  const related = useMemo(() => {
    if (!item?.related?.length) return [];
    return item.related
      .map((r) => {
        // só exibe se a obra relacionada também estiver pública (catálogo ou comunidade)
        const inCatalog = CATALOG.find((c) => c.id === r.id);
        if (inCatalog) {
          return { ...r, linkId: inCatalog.id, cover: r.cover || inCatalog.cover };
        }
        const inCommunity = community.find((c) => c.id === r.id);
        if (inCommunity) {
          return { ...r, linkId: `community_${inCommunity.id}` };
        }
        return null; // ainda não é pública — não mostra
      })
      .filter((r): r is RelatedWork & { linkId: string } => r !== null);
  }, [item, community]);

  if (!item) {
    return (
      <AppShell>
        <div className="p-10 text-center" style={{ color: "var(--fan-text-2)" }}>
          Recomendação não encontrada.
          <div className="mt-4">
            <Link
              to="/recommendations"
              className="text-sm underline"
              style={{ color: "var(--fan-pink-light)" }}
            >
              Voltar para recomendações
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const totals = buildTotals(item);

  return (
    <AppShell>
      {/* Topo — botão voltar flutuante */}
      <div className="relative">
        <button
          onClick={() => nav({ to: "/recommendations" })}
          aria-label="Voltar"
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(13,0,8,0.7)", border: "1px solid var(--fan-border)" }}
        >
          <ArrowLeft size={18} color="var(--fan-icon-blue)" />
        </button>

        {/* Capa em destaque, estilo pôster */}
        <div
          className="w-full flex items-center justify-center pt-14 pb-6 px-8"
          style={{ background: "linear-gradient(160deg, #2A0018 0%, var(--fan-bg) 70%)" }}
        >
          <div
            className="relative rounded-[18px] overflow-hidden shadow-2xl"
            style={{
              width: 190,
              aspectRatio: "2/3",
              background: "linear-gradient(135deg, var(--fan-bg-2), var(--fan-active-chip))",
              border: "1px solid var(--fan-rose-mid)",
            }}
          >
            <AwardCrownBadge title={item.title} />
            {item.cover ? (
              <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <MediaIcon type={item.type as MediaType} size={44} color="var(--fan-icon-blue)" />               
                <span className="text-sm font-semibold" style={{ color: "var(--fan-text-2)" }}>
                  {item.type}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Título e metadados principais */}
      <div className="px-5 mt-4 text-center">
        <div className="flex flex-wrap justify-center gap-1.5 mb-2">
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "var(--fan-tag)", color: "var(--fan-pink-light)" }}
          >
            {item.type}
          </span>
          {item.year > 0 && (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "var(--fan-bg-2)",
                color: "var(--fan-text-2)",
                border: "1px solid var(--fan-border)",
              }}
            >
              {item.year}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--fan-text)" }}>
          {item.title}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--fan-text-2)" }}>
          {item.author || "Autor não informado"}
        </p>
       {item.recommendedBy && (
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--fan-pink-light)" }}>
            Recomendado por @{item.recommendedBy}
          </p>
        )}

        <div className="flex items-center justify-center gap-8 mt-4">
          <button
            onClick={() => handleReact("like")}
            className="flex flex-col items-center gap-1"
            aria-label="Aplaudir"
          >
            <Heart
              size={30}
              color={myReaction === "like" ? "var(--fan-pink)" : "var(--fan-text-2)"}
              fill={myReaction === "like" ? "var(--fan-pink)" : "transparent"}
            />
            <span className="text-sm font-semibold" style={{ color: "var(--fan-text-2)" }}>
              {reactionCounts.likes}
            </span>
          </button>
          <button
            onClick={() => handleReact("boo")}
            className="flex flex-col items-center gap-1"
            aria-label="Vaiar"
          >
            <HeartCrack
              size={30}
              color={myReaction === "boo" ? "#9CA3AF" : "var(--fan-rose-mid)"}
              fill={myReaction === "boo" ? "#9CA3AF" : "transparent"}
            />
            <span className="text-sm font-semibold" style={{ color: "var(--fan-text-2)" }}>
              {reactionCounts.boos}
            </span>
          </button>
        </div>
      </div>

      {/* Avaliação */}
      <section className="mt-5 px-5">
        <SectionCard icon={<Star size={13} color="var(--fan-icon-blue)" />} title="Avaliação">
          {item.rating ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={16}
                  color={item.rating! >= n ? "var(--fan-pink-light)" : "var(--fan-rose-mid)"}
                  fill={item.rating! >= n ? "var(--fan-pink-light)" : "transparent"}
                />
              ))}
              <span className="text-sm ml-1" style={{ color: "var(--fan-text-2)" }}>
                {item.rating}/5
              </span>
            </div>
          ) : (
            <EmptyValue text="Sem avaliação registrada" />
          )}
        </SectionCard>
      </section>

      {/* Ficha técnica */}
      <section className="mt-3 px-5">
        <SectionCard icon={<Layers size={13} color="var(--fan-icon-blue)" />} title="Ficha técnica">
          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            {(FICHA_TECNICA_CONFIG[item.type] ?? FICHA_TECNICA_CONFIG.Anime).map((f) => (
              <Field
                key={f.key}
                label={f.label ?? FICHA_LABELS[f.key]}
                value={getFichaValue(item, totals, f.key)}
              />
            ))}
          </div>
        </SectionCard>
      </section>

      {/* Gêneros */}
      <section className="mt-3 px-5">
        <SectionCard icon={<Tag size={13} color="var(--fan-icon-blue)" />} title="Gênero">
          <ChipList items={item.genres} emptyText="Nenhum gênero informado" />
        </SectionCard>
      </section>

      {/* Tags */}
      <section className="mt-3 px-5">
        <SectionCard icon={<Tag size={13} color="var(--fan-icon-blue)" />} title="Tags">
          <ChipList items={item.tags} emptyText="Nenhuma tag informada" />
        </SectionCard>
      </section>

      {/* Reação do usuário */}
      <section className="mt-3 px-5">
        <SectionCard icon={<Heart size={13} color="var(--fan-icon-blue)" />} title="Reação do usuário">
          <ChipList items={item.reactions} emptyText="Nenhuma reação registrada" />
        </SectionCard>
      </section>

      {/* Comentário / notas pessoais */}
      <section className="mt-3 px-5">
        <SectionCard
          icon={<MessageSquare size={13} color="var(--fan-icon-blue)" />}
          title="Comentário do usuário"
        >
          <p
            className="text-sm leading-relaxed italic"
            style={{ color: item.notes ? "var(--fan-text-3)" : "var(--fan-text-2)" }}
          >
            {item.notes ? `"${item.notes}"` : "Nenhum comentário adicionado."}
          </p>
        </SectionCard>
      </section>

      {/* Link */}
      <section className="mt-3 px-5">
        <SectionCard icon={<LinkIcon size={13} color="var(--fan-icon-blue)" />} title="Link">
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold break-all"
              style={{ color: "var(--fan-pink-light)" }}
            >
              {item.link}
            </a>
          ) : (
            <EmptyValue text="Nenhum link informado" />
          )}
        </SectionCard>
      </section>

      {/* Comentários da comunidade */}
      <section className="mt-3 px-5">
        <SectionCard
          icon={<MessageSquare size={13} color="var(--fan-icon-blue)" />}
          title="Comentários da comunidade"
        >
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Deixe seu comentário sobre a obra..."
              className="flex-1 rounded-[10px] px-3 py-2 text-sm"
              style={{ background: "var(--fan-bg)", border: "1px solid var(--fan-border)", color: "var(--fan-text)" }}
            />
            <button
              onClick={handlePostComment}
              disabled={posting || !commentText.trim()}
              className="px-3 py-2 rounded-[10px] text-sm font-bold shrink-0 disabled:opacity-50"
              style={{ background: "var(--fan-pink)", color: "#1a0a12" }}
            >
              Enviar
            </button>
          </div>

          {comments.length === 0 ? (
            <EmptyValue text="Nenhum comentário ainda. Seja o primeiro!" />
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const canDelete = !!user && (user.uid === c.uid || isAdmin);
                return (
                  <div key={c.id} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--fan-pink-light)" }}>
                        @{c.username}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--fan-text-3)" }}>
                        {c.text}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => setConfirmDeleteComment(c.id)}
                        disabled={deletingComment}
                        aria-label="Apagar comentário"
                        className="shrink-0 mt-1 disabled:opacity-50"
                      >
                        <Trash2 size={15} color="var(--fan-text-2)" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hasMoreComments && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={loadMoreComments}
                disabled={loadingMoreComments}
                className="rounded-full px-5 py-2.5 text-sm font-bold"
                style={{
                  background: "var(--fan-bg-2)",
                  border: "1px solid var(--fan-pink)",
                  color: "var(--fan-pink-light)",
                  opacity: loadingMoreComments ? 0.6 : 1,
                }}
              >
                {loadingMoreComments ? "Carregando..." : "Carregar mais comentários"}
              </button>
            </div>
          )}

        </SectionCard>
      </section>

      {/* Obras relacionadas */}
      {/* Obras relacionadas */}
      <section className="mt-3 px-5 pb-6">
        <SectionCard icon={<Users2 size={13} color="var(--fan-icon-blue)" />} title="Obras relacionadas">
          {related.length ? (
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {related.map((r) => (
                <Link
                  key={r.linkId}
                  to="/rec/$id"
                  params={{ id: r.linkId }}
                  className="w-20 shrink-0 block"
                >
                  <div
                    className="relative w-full rounded-[8px] flex items-center justify-center overflow-hidden"
                    style={{
                      aspectRatio: "2/3",
                      background: "linear-gradient(135deg, var(--fan-bg-2), var(--fan-active-chip))",
                      border: "1px solid var(--fan-rose-mid)",
                    }}
                  >
                    <AwardCrownBadge title={r.title} />
                    {r.cover ? (
                      <img src={r.cover} alt={r.title} className="w-full h-full object-cover" />
                    ) : (
                      <MediaIcon type={r.type as any} size={20} color="var(--fan-icon-blue)" />
                    )}
                  </div>
                  <p
                    className="mt-1 text-sm font-semibold line-clamp-2 leading-tight"
                    style={{ color: "var(--fan-text)" }}
                  >
                    {r.title}
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--fan-text-2)" }}>
                    {r.relation}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyValue text="Nenhuma obra relacionada informada" />
          )}
        </SectionCard>
      </section>

      {/* CTA */}
      <div className="px-5 pb-10">
        <Link
          to="/add"
          className="block w-full py-3 rounded-[14px] text-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))" }}
        >
          Adicionar à biblioteca
        </Link>
      </div>

      {/* Confirmação: apagar comentário */}
      {confirmDeleteComment && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setConfirmDeleteComment(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-[20px] p-5"
            style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold" style={{ color: "var(--fan-text)" }}>
              Apagar comentário?
            </h2>
            <p className="text-sm mt-1.5" style={{ color: "var(--fan-text-2)" }}>
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setConfirmDeleteComment(null)}
                disabled={deletingComment}
                className="flex-1 py-2.5 rounded-[10px] text-sm font-bold disabled:opacity-50"
                style={{ background: "var(--fan-bg)", border: "1px solid var(--fan-border)", color: "var(--fan-text-2)" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteComment(confirmDeleteComment)}
                disabled={deletingComment}
                className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#CC0022" }}
              >
                {deletingComment ? "Apagando..." : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Componentes de apoio ─────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[14px] p-4"
      style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon}
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--fan-text-2)" }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--fan-text-2)" }}>
        {label}
      </p>
      <p
        className="text-sm font-medium mt-0.5"
        style={{ color: value ? "var(--fan-text-3)" : "var(--fan-text-2)" }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function ChipList({ items, emptyText }: { items?: string[]; emptyText: string }) {
  if (!items || items.length === 0) return <EmptyValue text={emptyText} />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((g) => (
        <span
          key={g}
          className="text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: "var(--fan-bg-2)", color: "var(--fan-text-2)", border: "1px solid var(--fan-border)" }}
        >
          {g}
        </span>
      ))}
    </div>
  );
}

function EmptyValue({ text }: { text: string }) {
  return (
    <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
      {text}
    </p>
  );
}
