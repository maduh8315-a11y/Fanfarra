import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  PauseCircle,
  Award,
  BarChart,
  Vote,
  CheckCircle,
  CalendarClock,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import {
  markAllNotificationsRead,
  useNotifications,
  type Notification,
} from "@/lib/fanfarra/extras";

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
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function NotificationsPage() {
  const nav = useNavigate();
  const notifs = useNotifications();

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
          className="text-[11px]"
          style={{ color: "var(--fan-pink)" }}
        >
          Marcar todas
        </button>
      </header>

      {notifs.length === 0 ? (
        <div className="text-center py-24">
          <Bell size={48} color="var(--fan-rose-mid)" className="mx-auto mb-3" />
          <p className="text-[13px]" style={{ color: "var(--fan-text-2)" }}>
            Nenhuma notificação por enquanto
          </p>
        </div>
      ) : (
        <ul>
          {notifs.map((n) => (
            <NotifItem key={n.id} n={n} />
          ))}
        </ul>
      )}
    </AppShell>
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
      <Icon size={24} color="var(--fan-pink)" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px]" style={{ color: "var(--fan-text)" }}>
          {n.text}
        </p>
      </div>
      <span className="text-[10px]" style={{ color: "var(--fan-text-2)" }}>
        {timeAgo(n.ts)}
      </span>
    </li>
  );
}
