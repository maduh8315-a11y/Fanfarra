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
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuthUser, signOut } from "@/lib/fanfarra/auth";
import { ADMIN_UIDS } from "@/lib/fanfarra/config";
import { useNotifications } from "@/lib/fanfarra/extras";
import { useIsPro } from "@/lib/fanfarra/config";
import { useOnlineStatus } from "@/hooks/use-online-status";

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
  const isAdmin = !!user && ADMIN_UIDS.includes(user.uid);
  const navigate = useNavigate();
  const notifications = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isPro = useIsPro();
  const isOnline = useOnlineStatus();
  function handleLogout() {
    signOut();
    setDrawerOpen(false);
    navigate({ to: "/login" });
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh", background: "var(--fan-bg)" }}>
      {!isOnline && (
        <div
          className="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-[12px] font-medium"
          style={{
            background: "var(--fan-pink)",
            color: "#fff",
            paddingTop: "calc(0.5rem + var(--sat))",
          }}
        >
          Você está offline
        </div>
      )}
      <main className="flex-1 pb-20">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 flex flex-row items-center justify-around px-0.5 pt-2 z-40"
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
              className="flex flex-col items-center gap-0.5 px-1 py-1 relative"
            >
             {isAdd ? (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200"
                  style={{ background: active ? "var(--fan-pink)" : "var(--fan-active-chip)" }}
                >
                  <Icon size={20} color="white" strokeWidth={2} />
                </div>
              ) : (
                <Icon
                  size={22}
                  color={active ? "var(--fan-pink-light)" : "var(--fan-rose-mid)"}
                  strokeWidth={2}
                  className="transition-colors duration-200"
                />
              )}
              <span
                className="text-[10px] whitespace-nowrap transition-colors duration-200"
                style={{ color: active ? "var(--fan-pink-light)" : "var(--fan-text-2)" }}
              >
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
          className="flex flex-col items-center gap-0.5 px-1 py-1"
          aria-label="Abrir menu"
        >
          <Menu size={22} color="var(--fan-text-2)" />
          <span className="text-[10px] whitespace-nowrap" style={{ color: "var(--fan-text-2)" }}>
            Menu
          </span>
        </button>
      </nav>

      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="flex-1"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`w-[80%] max-w-[320px] h-full overflow-y-auto transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
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
                      <User size={22} color="var(--fan-icon-blue)" />
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
              <DrawerLink to="/stats" icon={BarChart3} label="Estatísticas Avançadas" iconColor="var(--fan-icon-blue)" pro={isPro ? undefined : "full"} />
              <DrawerLink to="/wrapped" icon={Sparkles} label="Wrapped Anual" pro={isPro ? undefined : true} />

              <DrawerSection label="Comunidade" />
              <DrawerLink
                to="/awards"
                icon={Trophy}
                label="Fanfarra Awards"
                badge="Votação aberta"
              />
              <DrawerLink to="/challenges" icon={Award} label="Desafios Fandom" />
              <DrawerLink to="/collections" icon={Users} label="Minhas Estantes" pro={isPro ? undefined : true} />

              <DrawerSection label="Conta" />
              <DrawerLink
                to="/notifications"
                icon={Bell}
                label="Notificações"
                badge={unreadCount > 0 ? String(unreadCount) : undefined}
              />
              <DrawerLink to="/settings" icon={Settings} label="Configurações" />
              {isAdmin && (
                <DrawerLink
                  to="/admin"
                  icon={ShieldCheck}
                  label="Painel Admin"
                  iconColor="var(--fan-icon-blue)"
                />
              )}
              <DrawerLink to="/about" icon={Info} label="Sobre o App" iconColor="var(--fan-icon-blue)" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg"
              >
                <LogOut size={18} color="var(--fan-icon-blue)" />
                <span className="text-sm flex-1 text-left" style={{ color: "var(--fan-text-3)" }}>
                  Sair
                </span>
              </button>
            </nav>
          </aside>
      </div>
    </div>
  );
}

function DrawerLink({
  to,
  icon: Icon,
  label,
  pro,
  badge,
  iconColor,
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
  | "/stats"
  | "/admin";
  icon: typeof Home;
  label: string;
  // true = recurso tem partes gratuitas e partes PRO (badge dourado "PRO")
  // "full" = recurso é 100% travado pra quem não é PRO (badge rosa "PRO+")
  pro?: boolean | "full";
  badge?: string;
  iconColor?: string;
}) {
  return (
    <Link to={to} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg">
      <Icon size={18} color={iconColor ?? "var(--fan-pink)"} />
      <span
        className="text-sm flex-1 text-left"
        style={{ color: "var(--fan-text-3)" }}
      >
        {label}
      </span>
      {badge && (
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink)" }}
        >
          {badge}
        </span>
      )}

      {pro === "full" && (
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)", border: "0.5px solid var(--fan-pink)" }}
        >
          PRO+
        </span>
      )}
      {pro === true && (
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--fan-gold-bg)", color: "var(--fan-gold)" }}
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
      className="text-xs font-bold uppercase tracking-wider px-3 pt-3 pb-1"
      style={{ color: "var(--fan-text-2)" }}
    >
      {label}
    </div>
  );
}
