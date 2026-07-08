import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart2,
  Gift,
  Trophy,
  LayoutGrid,
  Zap,
  Palette,
  BellRing,
  Star,
  Wrench,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { DEV_MODE, useIsPro } from "@/lib/fanfarra/config";
import { updateSettings } from "@/lib/fanfarra/extras";
import { toast } from "sonner";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Fanfarra PRO — Leve seu fandom ao próximo nível" },
      {
        name: "description",
        content:
          "Recursos exclusivos do Fanfarra PRO: estatísticas avançadas, wrapped anual, coleções públicas, sem anúncios e mais.",
      },
    ],
  }),
  component: ProPage,
});

const FEATURES = [
  { icon: BarChart2, title: "Estatísticas avançadas", desc: "Gráficos detalhados do seu histórico de consumo" },
  { icon: Gift, title: "Fanfarra Wrapped Anual", desc: "Seu ano em fandom: rankings, conquistas e momentos" },
  { icon: Trophy, title: "Fanfarra Awards", desc: "Vote nas suas obras favoritas nas categorias do ano" },
  { icon: LayoutGrid, title: "Coleções Públicas", desc: "Crie e compartilhe listas com outros fãs" },
  { icon: Zap, title: "Sem anúncios", desc: "Experiência limpa e sem interrupções" },
  { icon: Palette, title: "Temas exclusivos", desc: "Personalize a aparência do app com temas PRO" },
  { icon: BellRing, title: "Notificações prioritárias", desc: "Alertas avançados de lançamentos e atualizações" },
  { icon: Star, title: "Badge PRO no perfil", desc: "Mostre que você é um fã de verdade" },
];

function ProPage() {
  const nav = useNavigate();
  const isPro = useIsPro();

  async function handleSubscribe() {
    if (!DEV_MODE) {
      toast.error("Pagamentos ainda não estão disponíveis nesta versão do app.");
      return;
    }
    await updateSettings({ pro: true });
    toast.success("PRO ativado! (compra simulada — modo de teste)");
    nav({ to: "/settings" });
  }

  async function handleManage() {
    if (!DEV_MODE) {
      toast.error("Gerenciamento de assinatura ainda não está disponível nesta versão.");
      return;
    }
    await updateSettings({ pro: false });
    toast.success("PRO desativado (modo de teste)");
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Fanfarra PRO
        </h1>
        <span className="w-6" />
      </header>

      {DEV_MODE && (
        <div
          className="mx-4 mb-4 flex items-center gap-2 px-3.5 py-2 rounded-[10px]"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
        >
          <Wrench size={14} color="var(--fan-text-2)" />
          <span className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
            Modo Dev — compras aqui são simuladas, sem cobrança real
          </span>
        </div>
      )}

      <div className="px-5 pt-2 pb-6 text-center">
        <span
          className="inline-block text-[11px] font-extrabold px-4 py-1.5 rounded-full text-white mb-4"
          style={{ background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))" }}
        >
          ✦ FANFARRA PRO
        </span>
        <h2 className="text-[22px] font-extrabold" style={{ color: "#FFE6F0" }}>
          {isPro ? "Você já é PRO! ✦" : "Leve seu fandom ao próximo nível"}
        </h2>
        <p className="text-[13px] mt-2" style={{ color: "var(--fan-text-2)" }}>
          {isPro
            ? "Aproveite todos os recursos exclusivos."
            : "Recursos exclusivos para os fãs mais dedicados."}
        </p>
        <div className="flex justify-center mt-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, var(--fan-active-chip) 0%, var(--fan-bg-2) 70%)",
              border: "1px solid var(--fan-rose-mid)",
            }}
          >
            <Sparkles size={36} color="var(--fan-pink-light)" fill="var(--fan-pink-light)" />
          </div>
        </div>
      </div>

      <section className="px-4">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--fan-text-3)" }}>
          O que está incluído
        </h3>
        <div className="space-y-2.5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="relative flex items-start gap-3 p-3.5 rounded-[14px]"
                style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
              >
                <div
                  className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--fan-border)" }}
                >
                  <Icon size={18} color="var(--fan-pink-light)" />
                </div>
                <div className="flex-1 min-w-0 pr-10">
                  <div className="text-[14px] font-bold" style={{ color: "#FFE6F0" }}>
                    {f.title}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--fan-text-2)" }}>
                    {f.desc}
                  </div>
                </div>
                <span
                  className="absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)" }}
                >
                  PRO
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-6">
        {isPro ? (
          <div
            className="p-4 rounded-[14px] flex flex-col items-center text-center"
            style={{ background: "var(--fan-bg-2)", border: "2px solid var(--fan-pink)" }}
          >
            <div className="text-[13px] font-bold" style={{ color: "#FFE6F0" }}>
              Sua assinatura está ativa
            </div>
            <button
              onClick={handleManage}
              className="mt-3 py-2 px-6 rounded-full text-[12px] font-bold text-white"
              style={{ background: "var(--fan-pink)" }}
            >
              Cancelar assinatura
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--fan-text-3)" }}>
              Escolha seu plano
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-4 rounded-[14px] flex flex-col"
                style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
              >
                <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--fan-text-2)" }}>
                  Mensal
                </div>
                <div className="mt-2 text-[18px] font-extrabold" style={{ color: "#FFE6F0" }}>
                  R$ 8,90
                  <span className="text-[11px] font-normal" style={{ color: "var(--fan-text-2)" }}>
                    /mês
                  </span>
                </div>
                <button
                  onClick={handleSubscribe}
                  className="mt-4 py-2 rounded-full text-[12px] font-bold text-white"
                  style={{ background: "var(--fan-pink)" }}
                >
                  Assinar agora
                </button>
              </div>

              <div
                className="p-4 rounded-[14px] flex flex-col relative"
                style={{ background: "var(--fan-bg-2)", border: "2px solid var(--fan-pink)" }}
              >
                <span
                  className="absolute -top-2 right-3 text-[8px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))" }}
                >
                  MELHOR VALOR
                </span>
                <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--fan-pink-light)" }}>
                  Anual
                </div>
                <div className="mt-2 text-[18px] font-extrabold" style={{ color: "#FFE6F0" }}>
                  R$ 69,90
                  <span className="text-[11px] font-normal" style={{ color: "var(--fan-text-2)" }}>
                    /ano
                  </span>
                </div>
                <div className="text-[10px]" style={{ color: "var(--fan-text-2)" }}>
                  equivale a R$ 5,83/mês
                </div>
                <button
                  onClick={handleSubscribe}
                  className="mt-3 py-2 rounded-full text-[12px] font-bold text-white"
                  style={{ background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))" }}
                >
                  Assinar agora
                </button>
              </div>
            </div>
          </>
        )}

        <p className="text-[11px] text-center mt-4" style={{ color: "var(--fan-rose-mid)" }}>
          Cancele quando quiser. Sem fidelidade.
        </p>
        <p className="text-[10px] text-center mt-1 mb-8" style={{ color: "var(--fan-rose-mid)" }}>
          Pagamentos via Google Play · RevenueCat
        </p>
      </section>
    </AppShell>
  );
}