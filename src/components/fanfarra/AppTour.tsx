import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

export interface TourStep {
  id: string;
  route: string;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "tour-home",
    route: "/",
    title: "Início",
    description: "Esse é o seu feed: rolê recente seu e da galera que você segue — o que tão vendo, lendo ou jogando agora. Bora dar um perdido geral primeiro.",
  },
  {
    id: "tour-menu",
    route: "/",
    title: "Menu",
    description: "Esse ☰ aqui abre o resto do app. Mas relaxa, não precisa clicar em nada — eu já vou te levando direto em cada parte.",
  },
  {
    id: "tour-library-modes",
    route: "/library",
    title: "Biblioteca",
    description: "Chegamos na sua estante. Essas abas aqui separam por modo de consumo: Ler, Assistir, Jogar, Ouvir. Escolhe um e o resto da tela se ajusta.",
  },
  {
    id: "tour-library-status",
    route: "/library",
    title: "Status da obra",
    description: "Aqui embaixo você filtra por status dentro do modo escolhido: lendo, quero ler, concluído, pausado... Dá pra ver só o que interessa na hora.",
  },
  {
    id: "tour-add-categories",
    route: "/add",
    title: "Adicionar",
    description: "Aqui é onde você registra qualquer obra nova. Escolhe a categoria — anime, livro, jogo, filme, o que for — e segue o fluxo.",
  },
  {
    id: "tour-add-form",
    route: "/add/Anime",
    title: "Como criar uma obra",
    description: "Entrando numa categoria (peguei Anime de exemplo), você passa por 4 etapas: informações básicas, status e progresso, categorização e avaliação — nota, resenha, gêneros, tudo isso. Preencheu, salvou, já cai na Biblioteca.",
  },
  {
    id: "tour-recommendations-title",
    route: "/recommendations",
    title: "Para você",
    description: "Recomendações puxadas pelo que você já avaliou e curtiu. Ótimo pra sair da bolha e achar coisa nova.",
  },
  {
    id: "tour-search-input",
    route: "/search",
    title: "Buscar",
    description: "Aqui você caça obra ou perfil de outro usuário só digitando o nome.",
  },
  {
    id: "tour-stats-title",
    route: "/stats",
    title: "Estatísticas Avançadas",
    description: "Gráficos sobre seus hábitos: gênero favorito, tempo total consumido, streak de dias ativos e mais.",
  },
  {
    id: "tour-wrapped-content",
    route: "/wrapped",
    title: "Wrapped Anual",
    description: new Date().getMonth() === 11
      ? "Um resumão animado do seu ano no Fanfarra: seus números, gêneros favoritos, streak de dias ativos e mais. Arrasta pros lados pra passar os slides."
      : "Um resumão animado do seu ano no Fanfarra. Ele libera de verdade em dezembro — fora disso, é isso que você tá vendo agora: um aviso dizendo que ainda não chegou.",
  },
  {
    id: "tour-awards-title",
    route: "/awards",
    title: "Fanfarra Awards",
    description: "Prêmio votado pela própria comunidade nas obras favoritas do ano.",
  },
  {
    id: "tour-challenges-title",
    route: "/challenges",
    title: "Desafios Fandom",
    description: "Metas pra cumprir e se destacar, tipo maratonar ou ler X livros num prazo. Cumpriu, ganha selo.",
  },
  {
    id: "tour-chat-title",
    route: "/chat",
    title: "Mensagens",
    description: "Bate-papo direto com seus amigos, tipo uma DM. Diferente das notificações, aqui rola conversa de verdade.",
  },
  {
    id: "tour-friends-title",
    route: "/friends",
    title: "Amigos",
    description: "Manda pedido, aceita pedido e acompanha o que a galera tá consumindo.",
  },
  {
    id: "tour-notifications-title",
    route: "/notifications",
    title: "Notificações",
    description: "Avisos rápidos: curtida, novo seguidor, pedido de amizade aceito.",
  },
  {
    id: "tour-profile-avatar",
    route: "/profile",
    title: "Seu perfil",
    description: "Chegamos no seu perfil. Dá pra trocar foto, capa e usuário direto por aqui.",
  },
  {
    id: "tour-profile-pinned",
    route: "/profile",
    title: "Obras fixadas",
    description: "Fixa até 5 obras favoritas aqui em cima — é tipo o mural principal do seu perfil.",
  },
  {
    id: "tour-profile-stats",
    route: "/profile",
    title: "Estatísticas do perfil",
    description: "Total de obras, concluídos, selos e streak de dias, tudo resumido aqui.",
  },
  {
    id: "tour-profile-badges",
    route: "/profile",
    title: "Selos",
    description: "Todo selo que você já desbloqueou fica exposto aqui, tipo troféu de conquista.",
  },
  {
    id: "tour-settings-support",
    route: "/settings",
    title: "Configurações",
    description: "Aqui você ajusta conta, privacidade e tema. E é bem aqui, em Suporte, que você revê esse tutorial de novo quando quiser.",
  },
];

const TOUR_DONE_KEY = "fanfarra:tour_done";
const TOUR_ACTIVE_KEY = "fanfarra:tour_active";
const TOUR_STEP_KEY = "fanfarra:tour_step";
export const START_TOUR_EVENT = "fanfarra:start-tour";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const CLOSE_DRAWER_EVENT = "fanfarra:close-drawer";

export function AppTour() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 280, height: 160 });

  // O AppShell (e esse componente junto) remonta a cada navegação —
  // por isso o passo atual fica salvo na sessão, não só no estado do React.
  useEffect(() => {
    const active = sessionStorage.getItem(TOUR_ACTIVE_KEY) === "1";
    if (active) {
      const saved = Number(sessionStorage.getItem(TOUR_STEP_KEY) ?? "0");
      setStep(Number.isFinite(saved) ? saved : 0);
      setRunning(true);
      return;
    }
    const done = localStorage.getItem(TOUR_DONE_KEY) === "1";
    if (!done) {
      const t = setTimeout(() => {
        sessionStorage.setItem(TOUR_ACTIVE_KEY, "1");
        sessionStorage.setItem(TOUR_STEP_KEY, "0");
        setStep(0);
        setRunning(true);
      }, 900);
      return () => clearTimeout(t);
    }
  }, []);

  // Permite reiniciar o tour de qualquer lugar do app (ex: Configurações).
  useEffect(() => {
    function onStart() {
      sessionStorage.setItem(TOUR_ACTIVE_KEY, "1");
      sessionStorage.setItem(TOUR_STEP_KEY, "0");
      setStep(0);
      setRunning(true);
    }
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, []);

  const current = TOUR_STEPS[step];

// Não usamos mais o menu lateral pra destacar nada — se estiver aberto,
  // avisa o AppShell pra fechar. Agora é por evento porque o tour roda no
  // layout raiz, fora do AppShell, então não tem mais acesso direto ao
  // estado do drawer.
  useEffect(() => {
    if (running) window.dispatchEvent(new Event(CLOSE_DRAWER_EVENT));
  }, [running]);

  // Navega pra página do passo atual, se ainda não estiver nela.
 const navigatedForStepRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running || !current) return;
    if (pathname === current.route) return;
    if (navigatedForStepRef.current === step) return;
    navigatedForStepRef.current = step;
    nav({ to: current.route as never });
  }, [running, step, pathname]);

  // Mede a posição do elemento a destacar, só quando já chegou na página certa.
  const scrolledForStepRef = useRef<number | null>(null);

  // Mede o tamanho real do card do tutorial — a descrição muda de tamanho
  // a cada passo, então um valor fixo não dá conta. Isso é essencial pra
  // não deixar o card vazar pra fora da tela no celular.
  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const r = tooltipRef.current.getBoundingClientRect();
    setTooltipSize({ width: r.width, height: r.height });
  }, [step, current, rect]);

  useEffect(() => {
    if (!running || !current || pathname !== current.route) {
      setRect(null);
      return;
    }
    let raf = 0;
    function measure() {
      const el = document.getElementById(current.id);
      if (el) {
        // Só rola a tela UMA vez por passo — rolar a cada frame travava
        // a tela quando o elemento era maior que a viewport (ex: o form inteiro).
        if (scrolledForStepRef.current !== step) {
          scrolledForStepRef.current = step;
          el.scrollIntoView({ block: "start" });
        }
        const r = el.getBoundingClientRect();
        // Limita a altura do recorte ao tamanho da tela — elementos maiores
        // que a viewport (como o formulário completo) jogavam o card do
        // tutorial pra fora da área visível.
        const clampedHeight = Math.min(r.height, window.innerHeight - 32);
        setRect({ top: r.top, left: r.left, width: r.width, height: clampedHeight });
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(measure);
    }
    const delay = setTimeout(() => {
      raf = requestAnimationFrame(measure);
    }, 250);
    return () => {
      clearTimeout(delay);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [running, step, pathname]);

  function finish() {
    localStorage.setItem(TOUR_DONE_KEY, "1");
    sessionStorage.removeItem(TOUR_ACTIVE_KEY);
    sessionStorage.removeItem(TOUR_STEP_KEY);
    setRunning(false);
    window.dispatchEvent(new Event(CLOSE_DRAWER_EVENT));
  }

  function next() {
    if (step >= TOUR_STEPS.length - 1) {
      finish();
      return;
    }
    const n = step + 1;
    sessionStorage.setItem(TOUR_STEP_KEY, String(n));
    setStep(n);
  }

  function prev() {
    const p = Math.max(0, step - 1);
    sessionStorage.setItem(TOUR_STEP_KEY, String(p));
    setStep(p);
  }

  if (!running || !current) return null;

  const pad = 8;
  const highlightStyle: CSSProperties = rect
    ? {
        position: "fixed",
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 14,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
        border: "2px solid var(--fan-pink)",
        pointerEvents: "none",
        zIndex: 200,
        transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
      }
    : {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        pointerEvents: "none",
        zIndex: 200,
      };

  const EDGE = 16;
  const tooltipWidth = Math.min(280, window.innerWidth - EDGE * 2);
  const tooltipHeight = tooltipSize.height || 160;

  let tooltipTop: number;
  let tooltipLeft: number;

  if (rect) {
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const preferBelow = spaceBelow >= tooltipHeight + EDGE * 2 || spaceBelow >= spaceAbove;

    tooltipTop = preferBelow ? rect.top + rect.height + EDGE : rect.top - tooltipHeight - EDGE;
    tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
  } else {
    tooltipTop = window.innerHeight / 2 - tooltipHeight / 2;
    tooltipLeft = window.innerWidth / 2 - tooltipWidth / 2;
  }

  // Trava final: seja qual for a conta acima, o card nunca fica fora da
  // área visível — crucial no celular, onde a tela é pequena.
  tooltipTop = Math.min(Math.max(tooltipTop, EDGE), window.innerHeight - tooltipHeight - EDGE);
  tooltipLeft = Math.min(Math.max(tooltipLeft, EDGE), window.innerWidth - tooltipWidth - EDGE);

  const tooltipStyle: CSSProperties = {
    position: "fixed",
    top: tooltipTop,
    left: tooltipLeft,
    maxHeight: window.innerHeight - EDGE * 2,
    overflowY: "auto",
    zIndex: 201,
  };

  return (
    <>
      <div style={highlightStyle} />
      <div
        ref={tooltipRef}
        className="p-4 rounded-2xl shadow-xl"
        style={{
          ...tooltipStyle,
          width: tooltipWidth,
          background: "var(--fan-bg-2)",
          border: "0.5px solid var(--fan-border)",
        }}
      >
        <div className="text-xs mb-1" style={{ color: "var(--fan-text-2)" }}>
          {step + 1} de {TOUR_STEPS.length}
        </div>
        <div className="text-sm font-bold mb-1" style={{ color: "var(--fan-text)" }}>
          {current.title}
        </div>
        <p className="text-sm mb-3" style={{ color: "var(--fan-text-2)" }}>
          {current.description}
        </p>
        <div className="flex items-center justify-between gap-2">
          <button onClick={finish} className="text-xs" style={{ color: "var(--fan-text-2)" }}>
            Pular
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "var(--fan-bg-3)", color: "var(--fan-text)" }}
              >
                Voltar
              </button>
            )}
            <button
              onClick={next}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "var(--fan-pink)", color: "#fff" }}
            >
              {step >= TOUR_STEPS.length - 1 ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

