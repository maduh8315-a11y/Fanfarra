import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  MoreVertical,
  Flag,
  UserPlus,
  UserCheck,
  MessageCircle,
  Eye,
  Ban,
  Award,
  Flame,
  CheckCircle2,
  ListChecks,
  X,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { EmptyState } from "@/components/fanfarra/EmptyState";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { useProfile } from "@/lib/fanfarra/extras";
import { useAuthUser } from "@/lib/fanfarra/auth";
import { getPublicProfileByUsername, reportProfile, type PublicProfile } from "@/lib/fanfarra/publicProfiles";
import {
  useFriends,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  blockUser,
  unblockUser,
  useIsBlockedByMe,
  useAmIBlockedBy,
} from "@/lib/fanfarra/friendsStore";
import { useFollowing, followUser, unfollowUser } from "@/lib/fanfarra/followStore";
import { usePublicRecommendations } from "@/lib/fanfarra/communityStore";

export const Route = createFileRoute("/u/$username")({
  head: () => ({ meta: [{ title: "Perfil — Fanfarra" }] }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  const me = useAuthUser();
  const myProfile = useProfile();
  const [target, setTarget] = useState<PublicProfile | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [openBadge, setOpenBadge] = useState<{ id: string; name: string; description: string } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getPublicProfileByUsername(username).then(setTarget);
  }, [username]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const friends = useFriends();
  const outgoing = useOutgoingFriendRequests();
  const incoming = useIncomingFriendRequests();
  const following = useFollowing();
  const allRecs = usePublicRecommendations();
  const isBlockedByMe = useIsBlockedByMe(target?.uid);
  const amIBlocked = useAmIBlockedBy(target?.uid);

  if (target === undefined) {
    return (
      <AppShell>
        <p className="text-sm text-center py-16" style={{ color: "var(--fan-text-2)" }}>
          Carregando...
        </p>
      </AppShell>
    );
  }

  if (target === null) {
    return (
      <AppShell>
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <Link to="/friends" aria-label="Voltar">
            <ArrowLeft size={22} color="var(--fan-text-2)" />
          </Link>
        </header>
        <EmptyState title={`Usuário "@${username}" não encontrado`} />
      </AppShell>
    );
  }

  const isMe = me?.uid === target.uid;
  const isFriend = friends.some((f) => f.friendUid === target.uid);
  const isOutgoing = outgoing.some((o) => o.toUid === target.uid);
  const incomingReq = incoming.find((i) => i.fromUid === target.uid);
  const isFollowing = following.some((f) => f.followingUid === target.uid);
  const recs = allRecs.filter((r) => r.uid === target.uid);
  const canInteract = !amIBlocked && !isBlockedByMe;

  const handleToggleBlock = async () => {
    const msg = isBlockedByMe
      ? `Desbloquear @${target.username}?`
      : `Bloquear @${target.username}? Isso remove a amizade e pedidos pendentes entre vocês.`;
    if (!confirm(msg)) return;
    try {
      if (isBlockedByMe) {
        await unblockUser(target.uid);
        toast.success("Usuário desbloqueado.");
      } else {
        await blockUser(target.uid);
        toast.success("Usuário bloqueado.");
      }
      setMenuOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar bloqueio.");
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Escreva um motivo para a denúncia.");
      return;
    }
    setReporting(true);
    try {
      await reportProfile(target.uid, target.username, reportReason);
      toast.success("Denúncia enviada. Nossa equipe vai analisar.");
      setReportOpen(false);
      setReportReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar denúncia.");
    } finally {
      setReporting(false);
    }
  };

  const handleToggleFollow = async () => {
    try {
      if (isFollowing) await unfollowUser(target.uid);
      else await followUser(target.uid, target.username, myProfile.username);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao seguir.");
    }
  };

 const coverImage = target.coverImage ?? null;
  const statusText = target.statusText ?? "";
  const genreTags = target.tags ?? [];
  const socialLinks = target.socialLinks ?? [];

  return (
    <AppShell>
      {/* ---------- Fundo fixo: a capa preenche a tela toda ---------- */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: coverImage
            ? `url(${coverImage})`
            : "linear-gradient(135deg,var(--fan-bg-2),var(--fan-red-dark))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 45%, var(--fan-bg) 85%)",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ---------- Cover / Header ---------- */}
        <div className="relative w-full">
          <div className="relative h-56 w-full sm:h-72">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4 sm:px-6">
            <Link
              to="/friends"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition hover:scale-105"
              style={{
                backgroundColor: "rgba(0,0,0,0.55)",
                border: "1px solid var(--fan-border)",
                color: "var(--fan-text)",
              }}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            {!isMe && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition hover:scale-105"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.55)",
                    border: "1px solid var(--fan-border)",
                    color: "var(--fan-text)",
                  }}
                  aria-label="Mais opções"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl shadow-2xl"
                    style={{ backgroundColor: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
                  >
                    <button
                      onClick={handleToggleBlock}
                      className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm transition hover:opacity-90"
                      style={{ color: "var(--fan-text)" }}
                    >
                      <Ban className="h-4 w-4" /> {isBlockedByMe ? "Desbloquear usuário" : "Bloquear usuário"}
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setReportOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm transition hover:opacity-90"
                      style={{ color: "#ff6b6b", borderTop: "1px solid var(--fan-border)" }}
                    >
                      <Flag className="h-4 w-4" /> Denunciar perfil
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---------- Avatar block ---------- */}
        <div className="relative -mt-16 flex flex-col items-center px-4 sm:-mt-20 sm:px-6">
          <div
            className="relative rounded-full p-[3px]"
            style={{
              background: "linear-gradient(135deg, var(--fan-pink), var(--fan-red), var(--fan-red-dark))",
              boxShadow: "0 0 0 4px var(--fan-bg), 0 10px 40px -8px rgba(255,0,0,0.55)",
            }}
          >
            <div
              className="h-28 w-28 overflow-hidden rounded-full sm:h-32 sm:w-32"
              style={{ backgroundColor: "var(--fan-bg-2)" }}
            >
              {target.avatar ? (
                <img
                  src={target.avatar}
                  alt={target.username}
                  className="h-full w-full object-cover"
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-2xl font-semibold"
                  style={{ color: "var(--fan-icon-blue)" }}
                >
                  {target.username.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {!isMe && canInteract && (
            <div className="mt-4 flex items-center gap-2">
              {isFriend ? (
                <Link
                  to="/chat/$uid"
                  params={{ uid: target.uid }}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"
                  style={{ backgroundColor: "var(--fan-pink)", color: "#fff" }}
                >
                  <MessageCircle size={16} /> Conversar
                </Link>
              ) : incomingReq ? (
                <button
                  onClick={async () => {
                    try {
                      await acceptFriendRequest(incomingReq.id, incomingReq, myProfile.username, myProfile.avatar);
                      toast.success("Pedido aceito!");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Erro ao aceitar.");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"
                  style={{ backgroundColor: "var(--fan-pink)", color: "#fff" }}
                >
                  <UserCheck size={16} /> Aceitar pedido
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await sendFriendRequest(target.uid, target.username, target.avatar, myProfile.username, myProfile.avatar);
                      toast.success("Pedido de amizade enviado!");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Erro ao enviar pedido.");
                    }
                  }}
                  disabled={isOutgoing}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"
                  style={{
                    backgroundColor: isOutgoing ? "var(--fan-active-chip)" : "var(--fan-pink)",
                    color: isOutgoing ? "var(--fan-text-2)" : "#fff",
                  }}
                >
                  <UserPlus size={16} /> {isOutgoing ? "Pendente" : "Adicionar"}
                </button>
              )}

              <button
                onClick={handleToggleFollow}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95"
                style={
                  isFollowing
                    ? { backgroundColor: "transparent", border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }
                    : {
                        backgroundColor: "var(--fan-pink)",
                        color: "#fff",
                        border: "1px solid var(--fan-pink)",
                        boxShadow: "0 8px 24px -8px rgba(255,0,0,0.6)",
                      }
                }
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4" /> Seguindo
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" /> Seguir
                  </>
                )}
              </button>
            </div>
          )}

          {!isMe && amIBlocked && (
            <p className="mt-4 text-center text-xs max-w-[240px]" style={{ color: "var(--fan-text-2)" }}>
              Você não pode interagir com este perfil.
            </p>
          )}

          {!isMe && isBlockedByMe && (
            <button
              onClick={handleToggleBlock}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"
              style={{ backgroundColor: "var(--fan-active-chip)", color: "var(--fan-text-2)" }}
            >
              <Ban size={16} /> Você bloqueou esse usuário — Desbloquear
            </button>
          )}
        </div>
      </div>

      {/* ---------- Info card ---------- */}
      <div className="mx-auto mt-6 w-full max-w-2xl px-4 sm:px-6">
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--fan-text)" }}>
              {target.username}
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--fan-text-2)" }}>
              @{target.username}
            </p>

            {statusText && (
              <div
                className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                style={{ backgroundColor: "var(--fan-active-chip)", color: "var(--fan-text-3)", border: "1px solid var(--fan-border)" }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--fan-pink-light)" }} />
                <span className="truncate">{statusText}</span>
              </div>
            )}
          </div>

          {target.bio && canInteract && (
            <p className="mt-4 text-center text-sm leading-relaxed" style={{ color: "var(--fan-text-3)" }}>
              {target.bio}
            </p>
          )}

          {genreTags.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {genreTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-xs"
                  style={{ backgroundColor: "var(--fan-tag)", color: "var(--fan-text-2)", border: "1px solid var(--fan-border)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {socialLinks.length > 0 && (
            <div className="mt-5 flex flex-col gap-2 border-t pt-4" style={{ borderColor: "var(--fan-border)" }}>
              {socialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:brightness-125"
                  style={{ backgroundColor: "var(--fan-bg-3)", border: "1px solid var(--fan-border)" }}
                >
                  <span className="text-sm font-medium" style={{ color: "var(--fan-text)" }}>
                    {link.platform}
                  </span>
                  <span className="max-w-[220px] truncate text-[11px]" style={{ color: "var(--fan-text-2)" }}>
                    {link.url}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {canInteract && (
        <>
          {/* ---------- Stats ---------- */}
          <div className="mx-auto mt-6 w-full max-w-2xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<ListChecks className="h-4 w-4" />} label="Na lista" value={recs.length} />
              <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Recomendações" value={recs.length} />
              <StatCard icon={<Award className="h-4 w-4" style={{ color: "var(--fan-gold)" }} />} label="Selos" value={0} accent />
              <StatCard icon={<Flame className="h-4 w-4" style={{ color: "var(--fan-pink-light)" }} />} label="Streak" value={0} />
            </div>
          </div>

          {/* ---------- Recomendações ---------- */}
          <div className="mx-auto mt-6 w-full max-w-2xl px-4 pb-16 sm:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--fan-text-2)" }}>
                Recomendações de {target.username}
              </h2>
              <span className="text-xs" style={{ color: "var(--fan-text-3)" }}>
                {recs.length}
              </span>
            </div>

            {recs.length === 0 ? (
              <EmptyState title="Ainda não publicou nenhuma recomendação." />
            ) : (
              <ul className="space-y-2">
                {recs.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/rec/$id"
                      params={{ id: `community_${r.id}` }}
                      className="flex items-center gap-3 rounded-[12px] px-3 py-2.5"
                      style={{ backgroundColor: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
                    >
                      <div
                        className="h-[60px] w-11 shrink-0 overflow-hidden rounded-lg flex items-center justify-center"
                        style={{ background: "var(--fan-border)" }}
                      >
                        {r.cover ? (
                          <img src={r.cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <MediaIcon type={r.type} size={20} className="opacity-80" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--fan-text)" }}>
                          {r.title}
                        </div>
                        <div className="text-xs" style={{ color: "var(--fan-text-2)" }}>
                          {r.type}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* ---------- Modal de denúncia ---------- */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setReportOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl p-5"
            style={{ background: "var(--fan-bg)", border: "1px solid var(--fan-border)" }}
          >
            <h2 className="mb-3 text-[15px] font-bold" style={{ color: "var(--fan-text)" }}>
              Denunciar @{target.username}
            </h2>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Descreva o motivo da denúncia..."
              rows={4}
              className="mb-3 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)", color: "var(--fan-text)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportOpen(false)}
                className="flex-1 rounded-full py-2.5 text-sm font-bold"
                style={{ background: "var(--fan-active-chip)", color: "var(--fan-text-2)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReport}
                disabled={reporting}
                className="flex-1 rounded-full py-2.5 text-sm font-bold"
                style={{ background: "#ff6b6b", color: "#fff" }}
              >
                {reporting ? "Enviando..." : "Enviar denúncia"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal de selo (placeholder, sem dados de selo público ainda) ---------- */}
      {openBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
          onClick={() => setOpenBadge(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div
                className="inline-flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(230,182,76,0.15)", color: "var(--fan-gold)", border: "1px solid var(--fan-gold)" }}
              >
                <Award className="h-7 w-7" />
              </div>
              <button
                onClick={() => setOpenBadge(null)}
                className="rounded-full p-1 transition hover:opacity-80"
                style={{ color: "var(--fan-text-2)" }}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--fan-text)" }}>
              {openBadge.name}
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--fan-text-3)" }}>
              {openBadge.description}
            </p>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        backgroundColor: accent ? "var(--fan-gold-bg)" : "var(--fan-bg-2)",
        border: `1px solid ${accent ? "var(--fan-gold)" : "var(--fan-border)"}`,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ color: "var(--fan-text-2)" }}>
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold" style={{ color: accent ? "var(--fan-gold)" : "var(--fan-text)" }}>
        {value}
      </div>
    </div>
  );
}