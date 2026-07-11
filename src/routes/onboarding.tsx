import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import { BarChart2, Library, Users } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const SLIDES: Array<{
  icon: ComponentType<{ size?: number; color?: string }>;
  title: string;
  desc: string;
}> = [
  {
    icon: Library,
    title: "Tudo em um lugar",
    desc: "Anime, mangá, fanfic, série, jogo, dorama, música e mais — rastreie os 15 tipos de mídia fandom num único app.",
  },
  {
    icon: BarChart2,
    title: "Seu progresso, sua história",
    desc: "Acompanhe episódios, capítulos, páginas e horas. Veja estatísticas, conquiste selos e reviva seu ano no Wrapped.",
  },
  {
    icon: Users,
    title: "Comunidade fandom",
    desc: "Vote no Fanfarra Awards, participe de Desafios Fandom e compartilhe Coleções Públicas com outros fãs.",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;

  function finish() {
    if (typeof window !== "undefined") {
      localStorage.setItem("fanfarra:onboarding_done", "1");
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col px-6"
      style={{
        background: "var(--fan-bg)",
        paddingTop: "calc(1.5rem + var(--sat))",
        paddingBottom: "calc(1.5rem + var(--sab))",
      }}
    >
      <div className="flex justify-end">
        <Link to="/login" onClick={finish} className="text-sm" style={{ color: "var(--fan-text-2)" }}>
          Pular
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <Icon size={64} color="var(--fan-icon-blue)" />
        <h1 className="mt-6 text-[22px] font-extrabold" style={{ color: "var(--fan-text)" }}>
          {slide.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed max-w-xs" style={{ color: "var(--fan-text-2)" }}>
          {slide.desc}
        </p>
      </div>

      <div className="flex justify-center gap-1.5 mb-6">
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            className="rounded-full transition-all"
            style={{
              width: idx === i ? 8 : 6,
              height: idx === i ? 8 : 6,
              background: idx === i ? "var(--fan-pink)" : "var(--fan-border)",
            }}
          />
        ))}
      </div>

      {!last ? (
        <button
          onClick={() => setI((v) => v + 1)}
          className="fan-btn-primary w-full"
          style={{ height: 50, fontSize: 15 }}
        >
          Próximo
        </button>
      ) : (
        <div className="space-y-3">
          <Link
            to="/register"
            onClick={finish}
            className="fan-btn-primary w-full block text-center"
            style={{ height: 50, lineHeight: "50px", fontSize: 15 }}
          >
            Criar conta
          </Link>
          <Link
            to="/login"
            onClick={finish}
            className="w-full block text-center rounded-full"
            style={{
              height: 50,
              lineHeight: "50px",
              background: "transparent",
              border: "1px solid var(--fan-rose-mid)",
              color: "var(--fan-text-2)",
              fontSize: 13,
            }}
          >
            Já tenho conta
          </Link>
        </div>
      )}
    </div>
  );
}
