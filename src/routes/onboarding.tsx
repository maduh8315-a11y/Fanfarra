import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { getTypeColor } from "@/lib/fanfarra/typeColors";
import {
  Sparkles,
  BookOpen,
  Film,
  Gamepad2,
  Music,
  Tv,
  Drama,
  Feather,
  Heart,
  Trophy,
  Users,
  Flame,
  BarChart3,
  Star,
  Award,
  Bookmark,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Bem-vindx ao Fanfarra" },
      {
        name: "description",
        content:
          "Rastreie anime, mangá, fanfics, séries, jogos e mais. Estatísticas, Wrapped anual e comunidade fandom.",
      },
    ],
  }),
  component: Onboarding,
});

type Slide = {
  title: string;
  description: string;
  scene: React.ReactNode;
};

/* ---------- Scenes ---------- */

const ACCENTS = {
  gold: "oklch(0.82 0.17 85)",
  purple: "oklch(0.65 0.22 305)",
  teal: "oklch(0.75 0.14 190)",
  green: "oklch(0.72 0.18 150)",
  magenta: "oklch(0.68 0.24 340)",
  amber: "oklch(0.78 0.16 60)",
};

// Helper: aplica a cor tanto na propriedade normal quanto na variável
// --icon-color, que é a única coisa que nossa regra escopada em
// .onboarding-screen svg { color: var(--icon-color) !important; } enxerga.
function iconStyle(color: string): React.CSSProperties {
  return { color, ["--icon-color" as any]: color };
}

function SceneMedia() {
  const items = [
    { icon: BookOpen, label: "Mangá", rot: -14, x: -110, y: -30, delay: 0.05, accent: getTypeColor("Manga") },
    { icon: Film, label: "Filme", rot: 8, x: 110, y: -60, delay: 0.12, accent: getTypeColor("Filme") },
    { icon: Drama, label: "Dorama", rot: -6, x: 120, y: 60, delay: 0.19, accent: getTypeColor("Dorama") },
    { icon: Music, label: "Música", rot: 12, x: -120, y: 70, delay: 0.26, accent: getTypeColor("Música") },
    { icon: Gamepad2, label: "Jogo", rot: -3, x: 0, y: -120, delay: 0.33, accent: getTypeColor("Jogo") },
    { icon: Feather, label: "Fanfic", rot: 4, x: 0, y: 120, delay: 0.4, accent: getTypeColor("Fanfic") },
  ];
  return (
    <div className="relative h-full w-full">
      {/* Blue halo behind center */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{ background: "color-mix(in oklab, var(--fan-icon-blue) 55%, transparent)" }}
      />
      {items.map(({ icon: Icon, label, rot, x, y, delay, accent }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6, y: y + 20 }}
          animate={{ opacity: 1, scale: 1, x, y, rotate: rot }}
          transition={{ delay, type: "spring", stiffness: 120, damping: 14 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 backdrop-blur-md"
            style={{
              background:
                "linear-gradient(160deg, color-mix(in oklab, var(--fan-bg-2) 85%, transparent), color-mix(in oklab, var(--fan-bg) 90%, transparent))",
              borderColor: `color-mix(in oklab, ${accent} 70%, transparent)`,
              boxShadow: `0 12px 30px -8px color-mix(in oklab, ${accent} 55%, transparent), 0 0 0 1px color-mix(in oklab, ${accent} 20%, transparent) inset`,
            }}
          >
            <Icon size={22} style={iconStyle(accent)} />
            <span
              className="text-[9px] font-medium uppercase tracking-wider"
              style={{ color: "var(--fan-text-2)" }}
            >
              {label}
            </span>
          </motion.div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--fan-pink), var(--fan-rose-mid))",
          boxShadow: "0 0 60px var(--fan-pink)",
        }}
      >
        <Sparkles size={28} style={iconStyle("var(--fan-icon-blue)")} />
      </motion.div>
    </div>
  );
}

function SceneStats() {
  const R = 78;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <motion.svg
        width="220"
        height="220"
        viewBox="0 0 220 220"
        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
        animate={{ opacity: 1, rotate: -90, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--fan-pink)" />
            <stop offset="100%" stopColor="var(--fan-icon-blue)" />
          </linearGradient>
        </defs>
        <circle
          cx="110"
          cy="110"
          r={R}
          fill="none"
          stroke="var(--fan-border)"
          strokeWidth="14"
        />
        <motion.circle
          cx="110"
          cy="110"
          r={R}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * 0.22 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
        />
        {[0, 1, 2, 3].map((i) => (
          <motion.circle
            key={i}
            cx="110"
            cy="110"
            r={R + 20 + i * 10}
            fill="none"
            stroke="var(--fan-pink)"
            strokeWidth="1"
            opacity={0.15 - i * 0.03}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.15 - i * 0.03 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          />
        ))}
      </motion.svg>
      <div className="absolute flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-5xl font-black tabular-nums"
          style={{ color: "var(--fan-text)" }}
        >
          78%
        </motion.div>
        <div
          className="mt-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--fan-text-2)" }}
        >
          Seu ano
        </div>
      </div>
      {[
        { icon: BarChart3, x: -130, y: -70, d: 0.9, color: ACCENTS.teal },
        { icon: Flame, x: 130, y: -60, d: 1.0, color: "var(--fan-pink)" },
        { icon: Star, x: -120, y: 80, d: 1.1, color: ACCENTS.gold },
        { icon: Sparkles, x: 130, y: 80, d: 1.2, color: ACCENTS.purple },
      ].map(({ icon: Icon, x, y, d, color }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, x, y }}
          animate={{ opacity: 1, scale: 1, x, y }}
          transition={{ delay: d, type: "spring" }}
          className="absolute flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-md"
          style={{
            background: "color-mix(in oklab, var(--fan-bg-2) 60%, transparent)",
            borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
            boxShadow: `0 8px 20px -6px color-mix(in oklab, ${color} 55%, transparent)`,
          }}
        >
          <Icon size={18} style={iconStyle(color)} />
        </motion.div>
      ))}
    </div>
  );
}

function SceneCommunity() {
  const nodes = [
    { icon: Trophy, x: 0, y: -110, size: 56, delay: 0.1, color: ACCENTS.gold },
    { icon: Award, x: -120, y: -20, size: 44, delay: 0.2, color: "var(--fan-icon-blue)" },
    { icon: Users, x: 120, y: -10, size: 48, delay: 0.3, color: ACCENTS.teal },
    { icon: Flame, x: -90, y: 100, size: 40, delay: 0.4, color: "var(--fan-pink)" },
    { icon: Bookmark, x: 100, y: 110, size: 42, delay: 0.5, color: ACCENTS.purple },
  ];
  return (
    <div className="relative h-full w-full">
      <svg className="absolute inset-0 h-full w-full" viewBox="-160 -160 320 320">
        {nodes.map((n, i) => (
          <motion.line
            key={i}
            x1="0"
            y1="0"
            x2={n.x}
            y2={n.y}
            stroke="var(--fan-border)"
            strokeWidth="1"
            strokeDasharray="3 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: n.delay, duration: 0.6 }}
          />
        ))}
      </svg>
      {nodes.map(({ icon: Icon, x, y, size, delay, color }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{ opacity: 1, scale: 1, x, y }}
          transition={{ delay, type: "spring", stiffness: 140, damping: 14 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.5 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center justify-center rounded-full border-2 backdrop-blur-md"
            style={{
              width: size,
              height: size,
              background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${color} 55%, transparent), color-mix(in oklab, var(--fan-bg-2) 85%, transparent))`,
              borderColor: `color-mix(in oklab, ${color} 60%, transparent)`,
              boxShadow: `0 12px 34px -6px color-mix(in oklab, ${color} 70%, transparent), 0 0 0 1px color-mix(in oklab, ${color} 25%, transparent) inset`,
            }}
          >
            <Icon size={size * 0.42} style={iconStyle("var(--fan-text)")} />
          </motion.div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, type: "spring" }}
        className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(135deg, var(--fan-pink), var(--fan-icon-blue))",
          boxShadow: "0 0 50px color-mix(in oklab, var(--fan-pink) 60%, transparent)",
        }}
      >
        <Heart size={28} style={iconStyle("var(--fan-text)")} fill="currentColor" />
      </motion.div>
    </div>
  );
}

/* ---------- Onboarding ---------- */

const slides: Slide[] = [
  {
    title: "Toda a sua fandom em um só lugar",
    description:
      "Anime, mangá, fanfic, dorama, jogo, série, música e mais 8 tipos. Se você consome, o Fanfarra rastreia.",
    scene: <SceneMedia />,
  },
  {
    title: "Seu progresso vira história",
    description:
      "Estatísticas ao vivo do que você maratona e um Wrapped anual pra mostrar pra todo mundo o quanto você viveu de fandom.",
    scene: <SceneStats />,
  },
  {
    title: "Fandom é melhor em bando",
    description:
      "Concorra nos Fanfarra Awards, encare desafios da comunidade e compartilhe coleções que só você poderia ter feito.",
    scene: <SceneCommunity />,
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== "undefined") {
      localStorage.removeItem("fanfarra:onboarding_done");
      localStorage.removeItem("fanfarra:auth_seen");
    }
  }, []);

  const finish = (to: "/register" | "/login") => {
    try {
      localStorage.setItem("fanfarra:auth_seen", "1");
    } catch {}
    navigate({ to });
  };

  const skip = () => finish("/login");

  const go = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(step + 1);
    else if (info.offset.x > 60) go(step - 1);
  };

  const current = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div
      className="onboarding-screen flex flex-col overflow-hidden"
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(120% 60% at 50% 0%, color-mix(in oklab, var(--fan-pink) 22%, transparent), transparent 60%), radial-gradient(80% 50% at 100% 100%, color-mix(in oklab, var(--fan-icon-blue) 15%, transparent), transparent 60%), var(--fan-bg)",
        color: "var(--fan-text)",
        paddingTop: "var(--sat)",
        paddingBottom: "var(--sab)",
      }}
    >
      {/* Decorative blurred blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklab, var(--fan-pink) 45%, transparent)" }}
        animate={{ y: [0, 20, 0], x: [0, 10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-32 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklab, var(--fan-icon-blue) 65%, transparent)" }}
        animate={{ y: [0, -20, 0], x: [0, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, var(--fan-pink), var(--fan-rose-mid))",
              boxShadow: "0 6px 20px -4px var(--fan-pink)",
            }}
          >
            <Sparkles size={16} style={iconStyle("var(--fan-text)")} />
          </div>
          <span className="text-sm font-black tracking-tight">Fanfarra</span>
        </div>
        <button
          onClick={skip}
          className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ color: "var(--fan-text-2)" }}
        >
          Pular
        </button>
      </header>

      {/* Main slide */}
      <main className="relative z-10 flex flex-1 flex-col">
        <motion.div
          className="relative flex-1"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
        >
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center px-6"
            >
              {/* Scene */}
              <div className="relative flex h-[46vh] w-full max-w-sm items-center justify-center">
                {current.scene}
              </div>

              {/* Text */}
              <div className="mt-4 flex flex-col items-center text-center">
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-[28px] font-black leading-[1.1] tracking-tight sm:text-3xl"
                  style={{ color: "var(--fan-text)" }}
                >
                  {current.title}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="mt-3 max-w-xs text-[15px] leading-relaxed"
                  style={{ color: "var(--fan-text-2)" }}
                >
                  {current.description}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <footer className="relative z-10 flex flex-col items-center gap-5 px-6 pb-6 pt-2">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === step ? 26 : 8,
                  background:
                    i === step
                      ? "linear-gradient(90deg, var(--fan-pink), var(--fan-rose-mid))"
                      : "var(--fan-border)",
                  boxShadow:
                    i === step
                      ? "0 0 12px color-mix(in oklab, var(--fan-pink) 70%, transparent)"
                      : "none",
                }}
              />
            ))}
          </div>

          {/* Actions */}
          {isLast ? (
            <div className="flex w-full max-w-sm flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => finish("/register")}
                className="h-12 w-full rounded-2xl text-sm font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--fan-pink), var(--fan-rose-mid))",
                  color: "var(--fan-text)",
                  boxShadow:
                    "0 14px 30px -10px color-mix(in oklab, var(--fan-pink) 80%, transparent)",
                }}
              >
                Criar conta
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => finish("/login")}
                className="h-12 w-full rounded-2xl border-2 text-sm font-semibold"
                style={{
                  borderColor: "color-mix(in oklab, var(--fan-icon-blue) 65%, transparent)",
                  color: "var(--fan-icon-blue)",
                  background: "color-mix(in oklab, var(--fan-icon-blue) 10%, transparent)",
                  boxShadow: "0 8px 24px -12px color-mix(in oklab, var(--fan-icon-blue) 70%, transparent)",
                }}
              >
                Já tenho conta
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -1 }}
              onClick={() => go(step + 1)}
              className="h-12 w-full max-w-sm rounded-2xl text-sm font-bold"
              style={{
                background:
                  "linear-gradient(135deg, var(--fan-pink), var(--fan-rose-mid))",
                color: "var(--fan-text)",
                boxShadow:
                  "0 14px 30px -10px color-mix(in oklab, var(--fan-pink) 80%, transparent)",
              }}
            >
              Próximo
            </motion.button>
          )}

          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--fan-text-2)" }}
          >
            Arraste para o lado para navegar
          </p>
        </footer>
      </main>
    </div>
  );
}