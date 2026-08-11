import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import {
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
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

// Decide pra onde a notificação leva quando o usuário toca nela.
// Retorna null quando não há pra onde ir (fica só marcando como lida).
function getNotifTarget(n: Notification): { to: string; params?: Record<string, string> } | null {
  switch (n.icon) {
    case "message-circle":
      return n.fromUid ? { to: "/chat/$uid", params: { uid: n.fromUid } } : { to: "/chat" };
    case "users":
    case "eye":
      return n.fromUsername ? { to: "/u/$username", params: { username: n.fromUsername } } : null;
    case "heart":
      if (n.recId) return { to: "/rec/$id", params: { id: `community_${n.recId}` } };
      return n.fromUsername ? { to: "/u/$username", params: { username: n.fromUsername } } : null;
    case "award":
      if (n.badgeId) {
        // o /profile lê essa chave ao montar e abre o selo automaticamente
        sessionStorage.setItem("fanfarra_highlight_badge", n.badgeId);
        return { to: "/profile" };
      }
      return { to: "/awards" };
    case "vote":
    case "bar-chart":
      return { to: "/awards" };
    case "check-circle":
      return { to: "/challenges" };
    case "calendar-clock":
    case "pause-circle":
    case "play-circle":
      return { to: "/library" };
    default:
      return null;
  }
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
        <h1 id="tour-notifications-title" className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
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
            if (item.kind === "notification")
              return <NotifItem key={`n-${item.data.id}`} n={item.data} nav={nav} />;
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

// Item de notificação: arraste pra esquerda pra revelar "excluir",
// toque pra marcar como lida e ir direto pro destino certo.
function NotifItem({ n, nav }: { n: Notification; nav: ReturnType<typeof useNavigate> }) {
  const Icon = ICONS[n.icon];
  const DELETE_W = 84;

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startDragX = useRef(0);
  const movedRef = useRef(false);
  const pointerId = useRef<number | null>(null);

const clamp = (v: number) => Math.min(0, Math.max(-DELETE_W, v));

  const onPointerDown = (e: React.PointerEvent) => {
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startDragX.current = dragX;
    movedRef.current = false;
    setDragging(true);
    // Trava o ponteiro neste elemento: sem isso, se o gesto for rápido, o
    // navegador pode entregar os próximos eventos pra quem estiver embaixo
    // do cursor no frame seguinte (não mais este item, que já deslizou) —
    // e o arraste "escapa", ficando difícil soltar em cima do botão.
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // alvo não suporta — segue sem travar
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 8) movedRef.current = true;
    setDragX(clamp(startDragX.current + delta));
  };
  const endDrag = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setDragging(false);
    setDragX((v) => (v < -DELETE_W / 2 ? -DELETE_W : 0));
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // idem
    }
  };

  const handleDelete = () => {
    setDragX(0);
    deleteNotification(n.id).catch(() => toast.error("Erro ao excluir notificação."));
  };

  const handleTap = () => {
    if (movedRef.current) return; // foi um arraste, não um toque
    if (dragX !== 0) {
      setDragX(0); // já estava aberto: só fecha
      return;
    }
    if (!n.read) markNotificationRead(n.id).catch(() => {});
    const target = getNotifTarget(n);
    if (target) nav(target as any);
  };

  return (
    <li className="relative overflow-hidden" style={{ borderBottom: "0.5px solid var(--fan-border)" }}>
      <button
        onClick={handleDelete}
        className="absolute right-0 top-0 h-full flex items-center justify-center"
        style={{ width: DELETE_W, background: "#e11d48" }}
        aria-label="Excluir notificação"
      >
        <Trash2 size={18} color="#fff" />
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleTap}
        className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
        style={{
          background: "var(--fan-bg-2)",
          borderLeft: n.read ? "none" : "3px solid var(--fan-pink)",
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
      >
        <Icon size={24} color={ICON_COLORS[n.icon]} strokeWidth={1.5} style={{ opacity: n.read ? 0.6 : 1 }} />
        <div className="flex-1 min-w-0" style={{ opacity: n.read ? 0.6 : 1 }}>
          <p className="text-sm" style={{ color: "var(--fan-text)" }}>
            {n.text}
          </p>
        </div>
        <span className="text-sm" style={{ color: "var(--fan-text-2)", opacity: n.read ? 0.6 : 1 }}>
          {timeAgo(n.ts)}
        </span>
      </div>
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