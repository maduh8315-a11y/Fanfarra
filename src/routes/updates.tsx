import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Wrench, Bug } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";

export const Route = createFileRoute("/updates")({
  head: () => ({ meta: [{ title: "Novidades — Fanfarra" }] }),
  component: UpdatesPage,
});

// ── Adicione uma entrada nova no TOPO da lista a cada atualização ──
// type: "new" (funcionalidade nova), "fix" (correção) ou "improvement" (melhoria)
type ChangeType = "new" | "fix" | "improvement";

interface UpdateEntry {
  version: string;
  date: string; // ex: "Agosto 2026"
  changes: { type: ChangeType; text: string }[];
}

const UPDATES: UpdateEntry[] = [
  {
    version: "1.1.0",
    date: "Agosto 2026",
    changes: [
      { type: "new", text: "Nova tela de Enviar feedback nas Configurações" },
      { type: "fix", text: "Corrigido espaçamento da seção de Música na tela de Adicionar" },
      { type: "fix", text: "Corrigido compartilhar e baixar imagem do Wrapped" },
      { type: "improvement", text: "Wrapped agora só fica disponível em dezembro" },
      { type: "improvement", text: "Fotos de perfil carregam mais rápido" },
      { type: "fix", text: "Navegação do app não é mais coberta pela barra do sistema Android" },
    ],
  },
  {
    version: "1.0.0",
    date: "Lançamento",
    changes: [{ type: "new", text: "Primeira versão do Fanfarra 🎉" }],
  },
];

const TYPE_CONFIG: Record<ChangeType, { icon: typeof Sparkles; color: string; label: string }> = {
  new: { icon: Sparkles, color: "var(--fan-pink)", label: "Novo" },
  fix: { icon: Bug, color: "var(--fan-icon-blue)", label: "Correção" },
  improvement: { icon: Wrench, color: "var(--fan-pink-light)", label: "Melhoria" },
};

function UpdatesPage() {
  const nav = useNavigate();
  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/settings" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Novidades
        </h1>
        <span className="w-6" />
      </header>

      <div className="px-4 pt-2 pb-10 flex flex-col gap-6">
        {UPDATES.map((u) => (
          <div key={u.version}>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-base font-bold" style={{ color: "var(--fan-text)" }}>
                Versão {u.version}
              </h2>
              <span className="text-xs" style={{ color: "var(--fan-text-2)" }}>
                {u.date}
              </span>
            </div>
            <div
              className="rounded-[12px] p-3 flex flex-col gap-2.5"
              style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
            >
              {u.changes.map((c, i) => {
                const cfg = TYPE_CONFIG[c.type];
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <Icon size={15} color={cfg.color} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
                      {c.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}