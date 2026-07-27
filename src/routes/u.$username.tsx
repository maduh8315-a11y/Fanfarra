import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, UserCheck, MessageCircle, Eye, Ban, Flag, MoreVertical } from "lucide-react";
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

  useEffect(() => {
    getPublicProfileByUsername(username).then(setTarget);
  }, [username]);

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
  }

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
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link to="/friends" aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </Link>
        {!isMe && (
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="Mais opções">
              <MoreVertical size={20} color="var(--fan-text-2)" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-8 z-20 w-48 rounded-[12px] overflow-hidden shadow-lg"
                style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
              >
                <button
                  onClick={handleToggleBlock}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-left"
                  style={{ color: "var(--fan-text)" }}
                >
                  <Ban size={15} /> {isBlockedByMe ? "Desbloquear usuário" : "Bloquear usuário"}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-left"
                  style={{ color: "#ff6b6b", borderTop: "0.5px solid var(--fan-border)" }}
                >
                  <Flag size={15} /> Denunciar perfil
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-col items-center px-4 pb-4">
        {target.avatar ? (
          <img src={target.avatar} alt="" className="w-20 h-20 rounded-full object-cover mb-3" />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-3 text-2xl font-bold"
            style={{ background: "var(--fan-red-dark)", color: "var(--fan-icon-blue)" }}
          >
            {target.username.slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          {target.username}
        </h1>
        {target.bio && !amIBlocked && !isBlockedByMe && (
          <p className="text-sm text-center mt-1 max-w-[280px]" style={{ color: "var(--fan-text-2)" }}>
            {target.bio}
          </p>
        )}

        {!isMe && !amIBlocked && !isBlockedByMe && (
          <div className="flex items-center gap-2 mt-4">
            {isFriend ? (
              <Link
                to="/chat/$uid"
                params={{ uid: target.uid }}
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
                style={{ background: "var(--fan-pink)", color: "#fff" }}
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
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
                style={{ background: "var(--fan-pink)", color: "#fff" }}
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
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
                style={{
                  background: isOutgoing ? "var(--fan-active-chip)" : "var(--fan-pink)",
                  color: isOutgoing ? "var(--fan-text-2)" : "#fff",
                }}
              >
                <UserPlus size={16} /> {isOutgoing ? "Pendente" : "Adicionar"}
              </button>
            )}

            <button
              onClick={async () => {
                try {
                  if (isFollowing) await unfollowUser(target.uid);
                  else await followUser(target.uid, target.username, myProfile.username);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao seguir.");
                }
              }}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
              style={{
                background: "var(--fan-active-chip)",
                color: isFollowing ? "var(--fan-pink-light)" : "var(--fan-text-2)",
                border: isFollowing ? "0.5px solid var(--fan-pink)" : "none",
              }}
            >
              <Eye size={16} /> {isFollowing ? "Seguindo" : "Seguir"}
            </button>
          </div>
        )}

        {!isMe && amIBlocked && (
          <p className="text-xs mt-4 text-center max-w-[240px]" style={{ color: "var(--fan-text-2)" }}>
            Você não pode interagir com este perfil.
          </p>
        )}

        {!isMe && isBlockedByMe && (
          <button
            onClick={handleToggleBlock}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full mt-4"
            style={{ background: "var(--fan-active-chip)", color: "var(--fan-text-2)" }}
          >
            <Ban size={16} /> Você bloqueou esse usuário — Desbloquear
          </button>
        )}
      </div>

      {!amIBlocked && !isBlockedByMe && (
      <>
      <div className="h-px mx-4 mb-3" style={{ background: "var(--fan-border)" }} />
      <h2 className="text-xs font-bold uppercase tracking-wider px-4 mb-2" style={{ color: "var(--fan-text-2)" }}>
        Recomendações de {target.username}
      </h2>

      {recs.length === 0 ? (
        <EmptyState title="Ainda não publicou nenhuma recomendação." />
      ) : (
        <ul className="px-4 space-y-2 pb-4">
          {recs.map((r) => (
            <li key={r.id}>
              <Link
                to="/rec/$id"
                params={{ id: `community_${r.id}` }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]"
                style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
              >
                <div
                  className="w-11 h-[60px] rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: "var(--fan-border)" }}
                >
                  {r.cover ? (
                    <img src={r.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MediaIcon type={r.type} size={20} className="opacity-80" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "var(--fan-text)" }}>
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
      </>
      )}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setReportOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl p-5"
            style={{ background: "var(--fan-bg)", border: "0.5px solid var(--fan-rose-mid)" }}
          >
            <h2 className="text-[15px] font-bold mb-3" style={{ color: "var(--fan-text)" }}>
              Denunciar @{target.username}
            </h2>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Descreva o motivo da denúncia..."
              rows={4}
              className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none mb-3"
              style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)", color: "var(--fan-text)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "var(--fan-active-chip)", color: "var(--fan-text-2)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReport}
                disabled={reporting}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "#ff6b6b", color: "#fff" }}
              >
                {reporting ? "Enviando..." : "Enviar denúncia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}