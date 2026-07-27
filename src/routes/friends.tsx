import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Search as SearchIcon, MessageCircle, UserMinus, UserCheck, Bell } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { EmptyState } from "@/components/fanfarra/EmptyState";
import { useProfile } from "@/lib/fanfarra/extras";
import {
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  useFriends,
  sendFriendRequest,
  removeFriend,
  useBlockedByMe,
} from "@/lib/fanfarra/friendsStore";
import { useFollowing, followUser, unfollowUser } from "@/lib/fanfarra/followStore";
import { usePublicProfile, searchUsersByUsername, type PublicProfile } from "@/lib/fanfarra/publicProfiles";

export const Route = createFileRoute("/friends")({
  head: () => ({ meta: [{ title: "Amigos — Fanfarra" }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const profile = useProfile();
  const friends = useFriends();
  const incoming = useIncomingFriendRequests();
  const outgoing = useOutgoingFriendRequests();
  const following = useFollowing();
  const blockedByMe = useBlockedByMe();

  const [q, setQ] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        setResults(await searchUsersByUsername(term));
      } catch {
        toast.error("Erro ao buscar usuários.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const visibleResults = results.filter((r) => !blockedByMe.includes(r.uid));
  const searching = q.trim().length > 0;

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Amigos ({friends.length})
        </h1>
        {incoming.length > 0 && (
          <Link
            to="/notifications"
            className="text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1"
            style={{ background: "var(--fan-pink)", color: "#fff" }}
          >
            <Bell size={12} />
            {incoming.length} pedido{incoming.length > 1 ? "s" : ""}
          </Link>
        )}
      </header>

      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-2 rounded-[10px] px-3 py-2.5"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
        >
          <SearchIcon size={18} color="var(--fan-rose-mid)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por @usuário..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--fan-text)" }}
          />
        </div>
      </div>

      {searching ? (
        loading ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--fan-text-2)" }}>
            Buscando...
          </p>
        ) : visibleResults.length === 0 ? (
          <EmptyState icon={SearchIcon} title="Nenhum usuário encontrado" />
        ) : (
          <ul className="px-4 space-y-2">
            {visibleResults.map((r) => {
              const isFriend = friends.some((f) => f.friendUid === r.uid);
              const isOutgoing = outgoing.some((o) => o.toUid === r.uid);
              const isIncoming = incoming.some((i) => i.fromUid === r.uid);
              const isFollowing = following.some((f) => f.followingUid === r.uid);
              return (
                <li
                  key={r.uid}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]"
                  style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
                >
                  <Avatar avatar={r.avatar} username={r.username} />
                  <Link to="/u/$username" params={{ username: r.username }} className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: "var(--fan-text)" }}>
                      {r.username}
                    </div>
                  </Link>

                  {isFriend ? (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--fan-text-2)" }}>
                      <UserCheck size={14} /> Amigos
                    </span>
                  ) : isIncoming ? (
                    <span className="text-xs" style={{ color: "var(--fan-text-2)" }}>
                      Te pediu amizade
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await sendFriendRequest(r.uid, r.username, r.avatar, profile.username, profile.avatar);
                          toast.success("Pedido de amizade enviado!");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Erro ao enviar pedido.");
                        }
                      }}
                      disabled={isOutgoing}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                      style={{
                        background: isOutgoing ? "var(--fan-active-chip)" : "var(--fan-pink)",
                        color: isOutgoing ? "var(--fan-text-2)" : "#fff",
                      }}
                    >
                      {isOutgoing ? "Pendente" : "Adicionar"}
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      try {
                        if (isFollowing) await unfollowUser(r.uid);
                        else await followUser(r.uid, r.username, profile.username);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Erro ao seguir.");
                      }
                    }}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                    style={{
                      background: "var(--fan-active-chip)",
                      color: isFollowing ? "var(--fan-pink-light)" : "var(--fan-text-2)",
                      border: isFollowing ? "0.5px solid var(--fan-pink)" : "none",
                    }}
                  >
                    {isFollowing ? "Seguindo" : "Seguir"}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <FriendsList friends={friends} />
      )}
    </AppShell>
  );
}

function Avatar({ avatar, username }: { avatar?: string; username?: string }) {
  return avatar ? (
    <img src={avatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
  ) : (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
      style={{ background: "var(--fan-red-dark)", color: "var(--fan-icon-blue)" }}
    >
      {(username ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function FriendsList({ friends }: { friends: ReturnType<typeof useFriends> }) {
  if (friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Você ainda não tem amigos por aqui"
        description="Busque por @usuário aqui em cima e envie um pedido de amizade."
      />
    );
  }
  return (
    <ul className="px-4 space-y-2">
      {friends.map((f) => (
        <FriendRow key={f.id} friendUid={f.friendUid} />
      ))}
    </ul>
  );
}

function FriendRow({ friendUid }: { friendUid: string }) {
  const p = usePublicProfile(friendUid);

  async function handleRemove() {
    if (!confirm(`Remover ${p?.username ?? "este usuário"} da sua lista de amigos?`)) return;
    try {
      await removeFriend(friendUid);
      toast.success("Amizade removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <li
      className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]"
      style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
    >
      <Avatar avatar={p?.avatar} username={p?.username} />
      <Link to="/u/$username" params={{ username: p?.username ?? "" }} className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: "var(--fan-text)" }}>
          {p?.username ?? "Carregando..."}
        </div>
      </Link>
      <Link
        to="/chat/$uid"
        params={{ uid: friendUid }}
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "var(--fan-active-chip)" }}
        aria-label="Conversar"
      >
        <MessageCircle size={16} color="var(--fan-pink-light)" />
      </Link>
      <button
        onClick={handleRemove}
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "var(--fan-active-chip)" }}
        aria-label="Remover amigo"
      >
        <UserMinus size={16} color="var(--fan-text-2)" />
      </button>
    </li>
  );
}