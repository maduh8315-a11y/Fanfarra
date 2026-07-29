import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  PauseCircle,
  Award,
  BarChart,
  Vote,
  CheckCircle,
  CalendarClock,
  UserPlus,
  Users,
  Heart,
  Eye,
  MessageCircle,
  Check,
  X,
  PlayCircle,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import {
  markAllNotificationsRead,
  useNotifications,
  useProfile,
  type Notification,
} from "@/lib/fanfarra/extras";
import {
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  type FriendRequest,
} from "@/lib/fanfarra/friendsStore";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notificações — Fanfarra" }] }),
  component: NotificationsPage,
});

const ICONS = {
  "pause-circle": PauseCircle,
  award: Award,
  "bar-chart": BarChart,
  vote: Vote,
  "check-circle": CheckCircle,
  "calendar-clock": CalendarClock,
  "user-plus": UserPlus,
  users: Users,
  heart: Heart,
  eye: Eye,
  "message-circle": MessageCircle,
  "play-circle": PlayCircle,
};

const ICON_COLORS: Record<keyof typeof ICONS, string> = {
  "pause-circle": "var(--fan-pink)",
  award: "var(--fan-pink)",
  "bar-chart": "var(--fan-gold)",
  vote: "var(--fan-pink)",
  "check-circle": "var(--fan-gold)",
  "calendar-clock": "var(--fan-gold)",
  "user-plus": "var(--fan-pink)",
  users: "var(--fan-pink)",
  heart: "var(--fan-pink)",
  eye: "var(--fan-gold)",
  "message-circle": "var(--fan-pink)",
  "play-circle": "#4ADE80",
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

type FeedItem =
  | { kind: "notification"; ts: number; data: Notification }
  | { kind: "incoming"; ts: number; data: FriendRequest }
  | { kind: "outgoing"; ts: number; data: FriendRequest };

function NotificationsPage() {
  const nav = useNavigate();
  const notifs = useNotifications();
  const incoming = useIncomingFriendRequests();
  const outgoing = useOutgoingFriendRequests();
  const profile = useProfile();

  const feed: FeedItem[] = [
    ...notifs.map((n): FeedItem => ({ kind: "notification", ts: n.ts, data: n })),
    ...incoming.map((r): FeedItem => ({ kind: "incoming", ts: r.createdAt, data: r })),
    ...outgoing.map((r): FeedItem => ({ kind: "outgoing", ts: r.createdAt, data: r })),
  ].sort((a, b) => b.ts - a.ts);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Notificações
        </h1>
        <button
          onClick={markAllNotificationsRead}
          className="text-sm"
          style={{ color: "var(--fan-pink)" }}
        >
          Marcar todas
        </button>
      </header>

      {feed.length === 0 ? (
        <EmptyStateFallback />
      ) : (
        <ul>
          {feed.map((item) => {
            if (item.kind === "notification") return <NotifItem key={`n-${item.data.id}`} n={item.data} />;
            if (item.kind === "incoming")
              return (
                <IncomingRequestItem
                  key={`in-${item.data.id}`}
                  r={item.data}
                  myUsername={profile.username}
                  myAvatar={profile.avatar}
                />
              );
            return <OutgoingRequestItem key={`out-${item.data.id}`} r={item.data} />;
          })}
        </ul>
      )}
    </AppShell>
  );
}

function EmptyStateFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
      <Bell size={28} color="var(--fan-text-2)" />
      <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
        Nenhuma notificação por enquanto
      </p>
    </div>
  );
}

function NotifItem({ n }: { n: Notification }) {
const Icon = ICONS[n.icon];
  return (
    <li
      className="flex items-start gap-3 px-4 py-3 relative"
      style={{
        background: "var(--fan-bg-2)",
        borderBottom: "0.5px solid var(--fan-border)",
        borderLeft: n.read ? "none" : "3px solid var(--fan-pink)",
        opacity: n.read ? 0.6 : 1,
      }}
    >
      <Icon size={24} color={ICON_COLORS[n.icon]} strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "var(--fan-text)" }}>
          {n.text}
        </p>
      </div>
      <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
        {timeAgo(n.ts)}
      </span>
    </li>
  );
}

function IncomingRequestItem({
  r,
  myUsername,
  myAvatar,
}: {
  r: FriendRequest;
  myUsername: string;
  myAvatar?: string;
}) {
  return (
    <li
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: "var(--fan-bg-2)", borderBottom: "0.5px solid var(--fan-border)", borderLeft: "3px solid var(--fan-pink)" }}
    >
      <UserPlus size={24} color="var(--fan-pink)" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "var(--fan-text)" }}>
          <strong>{r.fromUsername}</strong> te enviou um pedido de amizade.
        </p>
      </div>
      <button
        onClick={async () => {
          try {
            await acceptFriendRequest(r.id, r, myUsername, myAvatar);
            toast.success(`Agora você e ${r.fromUsername} são amigos!`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao aceitar.");
          }
        }}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--fan-pink)" }}
        aria-label="Aceitar"
      >
        <Check size={14} color="#fff" />
      </button>
      <button
        onClick={() => declineFriendRequest(r.id).catch(() => toast.error("Erro ao recusar."))}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--fan-active-chip)" }}
        aria-label="Recusar"
      >
        <X size={14} color="var(--fan-text-2)" />
      </button>
    </li>
  );
}

function OutgoingRequestItem({ r }: { r: FriendRequest }) {
  return (
    <li
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: "var(--fan-bg-2)", borderBottom: "0.5px solid var(--fan-border)", opacity: 0.75 }}
    >
      <UserPlus size={24} color="var(--fan-text-2)" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "var(--fan-text)" }}>
          Pedido de amizade enviado para <strong>{r.toUsername}</strong> — pendente.
        </p>
      </div>
      <button
        onClick={() => cancelFriendRequest(r.id).catch(() => toast.error("Erro ao cancelar."))}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--fan-active-chip)" }}
        aria-label="Cancelar pedido"
      >
        <X size={14} color="var(--fan-text-2)" />
      </button>
    </li>
  );
}