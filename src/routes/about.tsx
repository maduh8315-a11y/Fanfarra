import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Sparkles, Heart } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "Sobre o Fanfarra" }] }),
  component: AboutPage,
});

const LINKS = [
  { label: "Site oficial", url: "https://fanfarra.app" },
  { label: "Instagram do Fanfarra", url: "https://instagram.com/fanfarra.app" },
  { label: "Política de privacidade", url: "/privacy" },
  { label: "Termos de uso", url: "/terms" },
  { label: "Reportar um bug", url: "mailto:bugs@fanfarra.app" },
];

function AboutPage() {
  const nav = useNavigate();
  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Sobre o Fanfarra
        </h1>
        <span className="w-6" />
      </header>

      <div className="flex flex-col items-center mt-6 px-4">
        <div className="flex items-center gap-2">
          <Sparkles size={22} color="var(--fan-icon-blue)" fill="var(--fan-icon-blue)"/>
          <span className="text-2xl font-bold" style={{ color: "var(--fan-pink-light)" }}>
            Fanfarra
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--fan-text-2)" }}>
          Versão 1.0.0
        </p>
        <p className="text-sm mt-4 text-center" style={{ color: "var(--fan-text-3)" }}>
          Seu universo fandom em um só lugar.
        </p>
      </div>

      <ul
        className="mt-8 mx-4 rounded-[10px] overflow-hidden"
        style={{ border: "0.5px solid var(--fan-rose-mid)" }}
      >
        {LINKS.map((l) => {
          const isInternal = l.url.startsWith("/");
          const itemStyle = {
            background: "var(--fan-bg-2)",
            borderBottom: "0.5px solid var(--fan-border)",
          };
          return (
            <li key={l.url}>
              {isInternal ? (
                <Link
                  to={l.url}
                  className="flex items-center justify-between px-4 py-3"
                  style={itemStyle}
                >
                  <span className="text-sm" style={{ color: "var(--fan-text)" }}>
                    {l.label}
                  </span>
                </Link>
              ) : (
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-4 py-3"
                  style={itemStyle}
                >
                  <span className="text-sm" style={{ color: "var(--fan-text)" }}>
                    {l.label}
                  </span>
                  <ExternalLink size={14} color="var(--fan-text-2)" />
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-center text-sm mt-8 mb-8 flex items-center justify-center gap-1.5" style={{ color: "var(--fan-text-2)" }}>
        Desenvolvido com <Heart size={14} fill="var(--fan-pink)" color="var(--fan-pink)" /> pela equipe Fanfarra
      </p>
    </AppShell>
  );
}
