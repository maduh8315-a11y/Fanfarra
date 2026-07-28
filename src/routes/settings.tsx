import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, PanelBottomOpen, RefreshCw, Sun, Moon } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { ToggleField } from "@/components/fanfarra/forms/FormFields";
import { updateSettings, useSettings } from "@/lib/fanfarra/extras";
import { DEV_MODE, useIsPro, useIsAdmin } from "@/lib/fanfarra/config";
import { useAuthUser } from "@/lib/fanfarra/auth";
import { toast } from "sonner";
import { signOut } from "@/lib/fanfarra/auth";
import { enablePushNotifications } from "@/lib/fanfarra/pushNotifications";
import {
  ChangeEmailModal,
  ChangePasswordModal,
  DeleteAccountModal,
} from "@/components/fanfarra/AccountModals";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — Fanfarra" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const nav = useNavigate();
  const user = useAuthUser();
  const isAdmin = useIsAdmin(user?.uid);
  const s = useSettings();
  const isPro = useIsPro();
  const [modal, setModal] = useState<"email" | "password" | "delete" | null>(null);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Configurações
        </h1>
        <span className="w-6" />
      </header>

      <div className="px-4 space-y-6 pb-8">
        <Group title="Conta">
          <Link to="/profile">
            <Item label="Editar perfil" variant="navigate" />
          </Link>
          <Item label="Alterar e-mail" variant="modal" onClick={() => setModal("email")} />
          <Item label="Alterar senha" variant="modal" onClick={() => setModal("password")} />
          <Item
            label="Excluir conta"
            destructive
            variant="modal"
            onClick={() => setModal("delete")}
          />
        </Group>

        <Group title="Notificações">
          <Toggle
            label="Lembretes de obras pausadas"
            value={s.notif_paused}
            onChange={(v) => updateSettings({ notif_paused: v })}
          />
          <Toggle
            label="Alertas de eventos e votações"
            value={s.notif_events}
            onChange={(v) => updateSettings({ notif_events: v })}
          />
          <Toggle
            label="Novidades do app"
            value={s.notif_news}
            onChange={(v) => updateSettings({ notif_news: v })}
          />
          <Toggle
            label="Sons de notificação"
            value={s.notif_sound}
            onChange={(v) => updateSettings({ notif_sound: v })}
          />
          <Item
            label="Ativar notificações neste aparelho"
            variant="modal"
            onClick={async () => {
              const result = await enablePushNotifications();
              if (result === "granted") toast.success("Notificações ativadas!");
              else if (result === "denied")
                toast.error("Permissão negada. Ative nas configurações do navegador/aparelho.");
              else if (result === "unsupported")
                toast.error("Esse navegador não suporta notificações push.");
              else toast.error("Não deu pra ativar agora. Tenta de novo em instantes.");
            }}
          />
        </Group>

        <Group title="Privacidade">
          <Toggle
            label="Perfil público"
            value={s.privacy_public}
            onChange={(v) => updateSettings({ privacy_public: v })}
          />
          <Toggle
            label="Mostrar biblioteca publicamente"
            value={s.privacy_library}
            onChange={(v) => updateSettings({ privacy_library: v })}
          />
          <Toggle
            label="Permitir ser encontrado por e-mail"
            value={s.privacy_email}
            onChange={(v) => updateSettings({ privacy_email: v })}
          />
        </Group>

        <Group title="Sincronização">
          <Toggle
            label="Sincronizar com Firebase"
            value={s.sync_firebase}
            onChange={(v) => updateSettings({ sync_firebase: v })}
          />
          <button
            onClick={() => updateSettings({ lastSync: Date.now() })}
            className="w-full flex items-center justify-between px-3 py-3 rounded-[10px]"
            style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
          >
            <span
              className="text-sm flex items-center gap-2"
              style={{ color: "var(--fan-text-3)" }}
            >
              <RefreshCw size={14} color="var(--fan-icon-blue)" /> Forçar sincronização agora
            </span>
          </button>
          <p className="text-sm mt-1" style={{ color: "var(--fan-text-2)" }}>
            Última sincronização: {s.lastSync ? new Date(s.lastSync).toLocaleString("pt-BR") : "—"}
          </p>
        </Group>

        <Group title="Assinatura">
          <Item label={s.pro ? "Fanfarra PRO ativo ✦" : "Plano Gratuito"} />
          <Item
            label={s.pro ? "Gerenciar assinatura" : "Conhecer o Fanfarra PRO"}
            variant="navigate"
            onClick={() => nav({ to: "/pro" })}
          />
          {DEV_MODE && isAdmin && (
            <Item
              label={s.pro ? "[DEV] Desligar PRO (teste)" : "[DEV] Ligar PRO (teste)"}
              onClick={() => {
                updateSettings({ pro: !s.pro });
                toast.success(s.pro ? "PRO desativado (modo de teste)" : "PRO ativado (modo de teste)");
              }}
            />
          )}
        </Group>

       <Group title="Estilo">
          <Toggle
            label="Animações do app"
            value={s.animations}
            onChange={(v) => updateSettings({ animations: v })}
          />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
              Colunas da biblioteca
            </span>
            <div className="flex gap-2">
              {[2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => updateSettings({ libraryColumns: n as 2 | 3 })}
                  className={`fan-chip ${s.libraryColumns === n ? "fan-chip-active" : ""}`}
                >
                  {n} colunas
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
              Aparência
            </span>
            <div className="flex gap-2 mt-2">
              {(
                [
                  { id: "dark", label: "Escuro", icon: Moon },
                  { id: "light", label: "Claro", icon: Sun },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const selected = s.mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => updateSettings({ mode: m.id })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[10px]"
                    style={{
                      background: selected ? "var(--fan-active-chip)" : "var(--fan-bg-2)",
                      border: `1px solid ${selected ? "var(--fan-pink)" : "var(--fan-rose-mid)"}`,
                    }}
                  >
                    <Icon size={16} color={selected ? "var(--fan-pink-light)" : "var(--fan-text-2)"} />
                    <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
              Tema
            </span>
            <p className="text-xs mt-0.5" style={{ color: "var(--fan-text-2)" }}>
              Personaliza as cores só do seu perfil — o resto do app continua no visual padrão.
            </p>
            <div className="flex gap-2 mt-2">
              {(
                [
                  { id: "default", label: "Fanfarra", color: "#E63946", pro: false },
                  { id: "lunar", label: "Lunar", color: "#7C5CFF", pro: true },
                  { id: "aurora", label: "Aurora", color: "#10B981", pro: true },
                ] as const
              ).map((t) => {
                const locked = t.pro && !isPro;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (locked) {
                        nav({ to: "/pro" });
                        return;
                      }
                      updateSettings({ theme: t.id });
                    }}
                    className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-[10px]"
                    style={{
                      background: "var(--fan-bg-2)",
                      border: `1px solid ${s.theme === t.id ? t.color : "var(--fan-rose-mid)"}`,
                      opacity: locked ? 0.6 : 1,
                    }}
                  >
                    <span
                      style={{ width: 20, height: 20, borderRadius: "50%", background: t.color }}
                    />
                    <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
                      {t.label}
                    </span>
                    {t.pro && (
                      <span
                        className="absolute -top-1.5 -right-1.5 text-sm font-bold px-1 py-0.5 rounded-md"
                        style={{ background: "var(--fan-gold-bg)", color: "var(--fan-gold)" }}
                      >
                        PRO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Group>
      </div>

      <ChangeEmailModal open={modal === "email"} onClose={() => setModal(null)} />
      <ChangePasswordModal open={modal === "password"} onClose={() => setModal(null)} />
      <DeleteAccountModal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        onDeleted={() => {
          setModal(null);
          signOut();
          nav({ to: "/login" });
        }}
      />
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase font-bold mb-2" style={{ color: "var(--fan-text-2)" }}>
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Item({
  label,
  onClick,
  destructive,
  variant = "navigate",
}: {
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  // "navigate" = leva pra outra tela (seta pra frente).
  // "modal" = abre um modal/sheet na própria tela (ícone de painel).
  variant?: "navigate" | "modal";
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3"
      style={{ borderBottom: "0.5px solid var(--fan-border)" }}
    >
      <span
        className="text-sm"
        style={{ color: destructive ? "#CC2000" : "var(--fan-text-3)" }}
      >
        {label}
      </span>
      {variant === "modal" ? (
        <PanelBottomOpen size={16} color="var(--fan-rose-mid)" />
      ) : (
        <ChevronRight size={16} color="var(--fan-rose-mid)" />
      )}
    </button>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "0.5px solid var(--fan-border)" }}
    >
      <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
        {label}
      </span>
      <ToggleField value={value} onChange={onChange} />
    </div>
  );
}