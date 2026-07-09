import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Library,
  Plus,
  Search,
  Menu,
  X,
  Trophy,
  Users,
  Sparkles,
  Settings,
  Info,
  LogOut,
  User,
  Award,
  Wand2,
  Bell,
  BarChart3,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuthUser, signOut } from "@/lib/fanfarra/auth";
import { useNotifications } from "@/lib/fanfarra/extras";

const TABS = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/library", icon: Library, label: "Biblioteca" },
  { to: "/add", icon: Plus, label: "Adicionar" },
  { to: "/recommendations", icon: Wand2, label: "Para você" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = useAuthUser();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  function handleLogout() {
    signOut();
    setDrawerOpen(false);
    navigate({ to: "/login" });
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh", background: "var(--fan-bg)" }}>
      <main className="flex-1 pb-20">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 flex flex-row items-center justify-around px-2 pt-2 z-40"
        style={{
          background: "var(--fan-bg-3)",
          borderTop: "0.5px solid #1E0010",
          paddingBottom: "calc(0.75rem + var(--sab))",
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const isAdd = t.to === "/add";
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
            >
              {isAdd ? (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: active ? "var(--fan-pink)" : "var(--fan-active-chip)" }}
                >
                  <Icon size={20} color="white" strokeWidth={2} />
                </div>
              ) : (
                <Icon size={22} color={active ? "var(--fan-pink-light)" : "var(--fan-rose-mid)"} strokeWidth={2} />
              )}
              <span className="text-[9px]" style={{ color: active ? "var(--fan-pink-light)" : "var(--fan-rose-mid)" }}>
                {t.label}
              </span>
              {active && !isAdd && (
                <span
                  className="absolute -bottom-1 w-1 h-1 rounded-full"
                 style={{ background: "var(--fan-pink)" }}
                />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1"
          aria-label="Abrir menu"
        >
          <Menu size={22} color="var(--fan-rose-mid)" />
          <span className="text-[9px]" style={{ color: "var(--fan-rose-mid)" }}>
            Menu
          </span>
        </button>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="w-[80%] max-w-[320px] h-full overflow-y-auto"
            style={{ background: "var(--fan-bg)", paddingTop: "var(--sat)" }}
          >
            <div className="p-5 flex items-center justify-between">
              {user ? (
                <Link
                  to="/profile"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "var(--fan-red-dark)" }}
                    >
                      <User size={22} color="var(--fan-pink-light)" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold" style={{ color: "var(--fan-text)" }}>
                      {user.displayName || "Fã Anônimo"}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
                      {user.email}
                    </div>
                  </div>
                </Link>
              ) : (
                <div />
              )}
              <button onClick={() => setDrawerOpen(false)} aria-label="Fechar">
                <X size={22} color="var(--fan-text-2)" />
              </button>
            </div>
            <div className="h-px mx-5" style={{ background: "var(--fan-rose-mid)" }} />
            <nav className="p-3 space-y-1" onClick={() => setDrawerOpen(false)}>
              <DrawerSection label="Principal" />
              <DrawerLink to="/search" icon={Search} label="Buscar" />

              <DrawerSection label="Descobrir" />
              <DrawerLink to="/stats" icon={BarChart3} label="Estatísticas Avançadas" />
              <DrawerLink to="/wrapped" icon={Sparkles} label="Wrapped Anual" pro />

              <DrawerSection label="Comunidade" />
              <DrawerLink
                to="/awards"
                icon={Trophy}
                label="Fanfarra Awards"
                badge="Votação aberta"
              />
              <DrawerLink to="/challenges" icon={Award} label="Desafios Fandom" />
              <DrawerLink to="/collections" icon={Users} label="Minhas Estantes" />

              <DrawerSection label="Conta" />
              <DrawerLink
                to="/notifications"
                icon={Bell}
                label="Notificações"
                badge={unreadCount > 0 ? String(unreadCount) : undefined}
              />
              <DrawerLink to="/settings" icon={Settings} label="Configurações" />
              <DrawerLink to="/about" icon={Info} label="Sobre o App" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg"
              >
                <LogOut size={18} color="var(--fan-pink)" />
                <span className="text-sm flex-1 text-left" style={{ color: "var(--fan-text-3)" }}>
                  Sair
                </span>
              </button>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

function DrawerLink({
  to,
  icon: Icon,
  label,
  pro,
  badge,
  highlight,
}: {
 to:
    | "/"
    | "/library"
    | "/search"
    | "/add"
    | "/recommendations"
    | "/notifications"
    | "/awards"
    | "/challenges"
    | "/collections"
    | "/wrapped"
    | "/profile"
    | "/pro"
    | "/settings"
    | "/about"
    | "/stats";
  icon: typeof Home;
  label: string;
  pro?: boolean;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <Link to={to} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg">
      <Icon size={18} color="var(--fan-pink)" />
      <span
        className="text-sm flex-1 text-left"
        style={{ color: "var(--fan-text-3)", fontWeight: highlight ? 700 : 400 }}
      >
        {label}
      </span>
      {badge && (
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink)" }}
        >
          {badge}
        </span>
      )}
      {highlight && (
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))" }}
        >
          PRO
        </span>
      )}
      {pro && (
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--fan-red-dark)", color: "var(--fan-pink-light)" }}
        >
          PRO
        </span>
      )}
    </Link>
  );
}

function DrawerSection({ label }: { label: string }) {
  return (
    <div
      className="text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-1"
      style={{ color: "var(--fan-text-2)" }}
    >
      {label}
    </div>
  );
}
