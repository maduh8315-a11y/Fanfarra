import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { logEvent } from "@/lib/fanfarra/analytics";

export interface TourStep {
  id: string;
  route: string;
  title: string;
  description: string;
  // Quando true, esse passo mostra o item dentro do menu lateral (☰) aberto,
  // em vez de navegar pra página que ele abre.
  openDrawer?: boolean;
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
    description: "Esse ☰ aqui abre o resto do app. Relaxa, não precisa clicar em nada — eu vou abrir o menu e te mostrar cada opção direto por aqui.",
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
    id: "tour-stats",
    route: "/",
    openDrawer: true,
    title: "Estatísticas Avançadas",
    description: "Gráficos sobre seus hábitos: gênero favorito, tempo total consumido, streak de dias ativos e mais.",
  },
  {
    id: "tour-wrapped",
    route: "/",
    openDrawer: true,
    title: "Wrapped Anual",
    description: new Date().getMonth() === 11
      ? "Um resumão animado do seu ano no Fanfarra: seus números, gêneros favoritos, streak de dias ativos e mais. Em dezembro é só abrir aqui e arrastar pros lados pra ver os slides."
      : "Um resumão animado do seu ano no Fanfarra: seus números, gêneros favoritos, streak de dias ativos e mais. Ele libera de verdade em dezembro — fora disso, abrir aqui só mostra um aviso dizendo que ainda não chegou a hora.",
  },
  {
    id: "tour-awards",
    route: "/",
    openDrawer: true,
    title: "Fanfarra Awards",
    description: "Prêmio votado pela própria comunidade nas obras favoritas do ano.",
  },
  {
    id: "tour-challenges",
    route: "/",
    openDrawer: true,
    title: "Desafios Fandom",
    description: "Metas pra cumprir e se destacar, tipo maratonar ou ler X livros num prazo. Cumpriu, ganha selo.",
  },
  {
    id: "tour-chat",
    route: "/",
    openDrawer: true,
    title: "Mensagens",
    description: "Bate-papo direto com seus amigos, tipo uma DM. Diferente das notificações, aqui rola conversa de verdade.",
  },
  {
    id: "tour-friends",
    route: "/",
    openDrawer: true,
    title: "Amigos",
    description: "Manda pedido, aceita pedido e acompanha o que a galera tá consumindo.",
  },
  {
    id: "tour-notifications",
    route: "/",
    openDrawer: true,
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
    id: "tour-settings",
    route: "/",
    openDrawer: true,
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
export const OPEN_DRAWER_EVENT = "fanfarra:open-drawer";

// Calcula o espaço reservado pela status bar/notch (topo) e pela barra
// inferior fixa do app (embaixo), pra nunca desenhar o destaque nem o card
// do tour por baixo delas — antes o tour ignorava essa margem e ficava
// cortado/coberto, diferente do resto do app (que respeita esse respiro).
function getTourSafeBounds() {
  const topInset = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--sat"),
  ) || 0;
  const nav = document.getElementById("fanfarra-bottom-nav");
  const navHeight = nav ? nav.getBoundingClientRect().height : 0;
  return {
    top: topInset + 20,
    bottom: navHeight + 12,
  };
}

// Acha o ancestral com scroll próprio mais próximo do elemento (ex: o menu
// lateral, que rola por dentro dele mesmo, separado da página). Sem isso, o
// tour só rolava a janela e itens de menu mais pra baixo ficavam fora da
// área visível, com o destaque desenhado longe do item real.
function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el && el !== document.body) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

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
        logEvent("tutorial_iniciado", { total_passos: TOUR_STEPS.length });
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

// Passos que explicam itens de dentro do menu lateral (☰) pedem pro
  // AppShell abrir o menu de verdade e destacam o item ali dentro, em vez de
  // navegar pra página que ele abre. Nos demais passos, garante que o menu
  // esteja fechado. É por evento porque o tour roda no layout raiz, fora do
  // AppShell, então não tem acesso direto ao estado do drawer.
  useEffect(() => {
    if (!running || !current) return;
    if (current.openDrawer && pathname === current.route) {
      window.dispatchEvent(new Event(OPEN_DRAWER_EVENT));
    } else {
      window.dispatchEvent(new Event(CLOSE_DRAWER_EVENT));
    }
  }, [running, step, pathname, current]);

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
        const bounds = getTourSafeBounds();
        // Só rola a tela UMA vez por passo — rolar a cada frame travava
        // a tela quando o elemento era maior que a viewport (ex: o form inteiro).
       if (scrolledForStepRef.current !== step) {
          scrolledForStepRef.current = step;
          // Se o item estiver dentro de um menu com rolagem própria (ex: o
          // menu lateral), rola esse container primeiro — senão o item pode
          // ficar fora da área visível dele mesmo com a página no lugar certo.
          const scrollParent = getScrollParent(el);
          if (scrollParent) {
            const parentRect = scrollParent.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const innerTarget = scrollParent.scrollTop + (elRect.top - parentRect.top) - 16;
            scrollParent.scrollTo({ top: Math.max(0, innerTarget), behavior: "auto" });
          }
          // Rola manualmente em vez de usar scrollIntoView("start"): esse
          // método ignora a status bar/notch e cola o elemento bem no topo
          // real da tela, ficando coberto por ela — diferente do resto do
          // app, que sempre respeita essa margem.
          const r0 = el.getBoundingClientRect();
          const target = window.scrollY + r0.top - bounds.top;
          window.scrollTo({ top: Math.max(0, target), behavior: "auto" });
        }
        const r = el.getBoundingClientRect();
        // Limita a altura do recorte ao espaço realmente visível entre a
        // status bar e a barra inferior fixa — elementos maiores que isso
        // (como o formulário completo) jogavam o card do tutorial pra fora
        // da área visível ou por baixo do menu inferior.
        const clampedHeight = Math.min(r.height, window.innerHeight - bounds.top - bounds.bottom);
        setRect({ top: r.top, left: r.left, width: r.width, height: clampedHeight });
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(measure);
    }
    // Passos que abrem o menu lateral precisam de mais tempo pra animação
    // de abertura do drawer terminar antes de medir a posição do item.
    const delay = setTimeout(
      () => {
        raf = requestAnimationFrame(measure);
      },
      current.openDrawer ? 380 : 250,
    );
    return () => {
      clearTimeout(delay);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [running, step, pathname]);

  function finish(reason: "concluido" | "pulado") {
    logEvent(reason === "concluido" ? "tutorial_concluido" : "tutorial_pulado", {
      passo_final: step + 1,
      total_passos: TOUR_STEPS.length,
    });
    localStorage.setItem(TOUR_DONE_KEY, "1");
    sessionStorage.removeItem(TOUR_ACTIVE_KEY);
    sessionStorage.removeItem(TOUR_STEP_KEY);
    setRunning(false);
    window.dispatchEvent(new Event(CLOSE_DRAWER_EVENT));
  }

  function next() {
    if (step >= TOUR_STEPS.length - 1) {
      finish("concluido");
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
  const EDGE = 16;
  const bounds = getTourSafeBounds();

  // Trava o retângulo de destaque dentro da área visível — nunca por baixo
  // da status bar/notch nem da barra inferior, e nunca vazando pros lados.
  // Antes ele usava a posição bruta do elemento e podia estourar a tela em
  // seções largas (Estatísticas) ou fora da área segura (menu, carrossel).
  let highlightStyle: CSSProperties;
  if (rect) {
    const rawLeft = rect.left - pad;
    const rawTop = rect.top - pad;
    const rawRight = rect.left + rect.width + pad;
    const rawBottom = rect.top + rect.height + pad;

    const left = Math.max(4, rawLeft);
    const top = Math.max(bounds.top, rawTop);
    const right = Math.min(window.innerWidth - 4, rawRight);
    const bottom = Math.min(window.innerHeight - bounds.bottom, rawBottom);

    highlightStyle = {
      position: "fixed",
      top,
      left,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
      borderRadius: 14,
      boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
      border: "2px solid var(--fan-tour-accent)",
      pointerEvents: "none",
      zIndex: 200,
      transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
    };
  } else {
    highlightStyle = {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      pointerEvents: "none",
      zIndex: 200,
    };
  }

  const tooltipWidth = Math.min(280, window.innerWidth - EDGE * 2);
  const tooltipHeight = tooltipSize.height || 160;

  let tooltipTop: number;
  let tooltipLeft: number;

  if (rect) {
    const spaceBelow = window.innerHeight - bounds.bottom - (rect.top + rect.height);
    const spaceAbove = rect.top - bounds.top;
    const preferBelow = spaceBelow >= tooltipHeight + EDGE * 2 || spaceBelow >= spaceAbove;

    tooltipTop = preferBelow ? rect.top + rect.height + EDGE : rect.top - tooltipHeight - EDGE;
    tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
  } else {
    tooltipTop = window.innerHeight / 2 - tooltipHeight / 2;
    tooltipLeft = window.innerWidth / 2 - tooltipWidth / 2;
  }

  // Trava final: o card nunca fica por baixo da status bar (topo) nem por
  // baixo da barra inferior fixa do app — antes ele podia ficar coberto por
  // uma das duas, diferente do resto do app, que sempre respeita essa margem.
  tooltipTop = Math.min(Math.max(tooltipTop, bounds.top), window.innerHeight - bounds.bottom - tooltipHeight);
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
         background: "var(--fan-tour-bg)",
          border: "0.5px solid var(--fan-tour-border)",
        }}
      >
        <div className="text-xs mb-1" style={{ color: "var(--fan-tour-text-2)" }}>
          {step + 1} de {TOUR_STEPS.length}
        </div>
        <div className="text-sm font-bold mb-1" style={{ color: "var(--fan-tour-text)" }}>
          {current.title}
        </div>
        <p className="text-sm mb-3" style={{ color: "var(--fan-tour-text-2)" }}>
          {current.description}
        </p>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => finish("pulado")} className="text-xs" style={{ color: "var(--fan-tour-text-2)" }}>
            Pular
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "var(--fan-tour-chip)", color: "var(--fan-tour-text)" }}
              >
                Voltar
              </button>
            )}
            <button
              onClick={next}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "var(--fan-tour-accent)", color: "var(--fan-tour-accent-text)" }}
            >
              {step >= TOUR_STEPS.length - 1 ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

