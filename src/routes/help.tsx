// src/routes/help.tsx
import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Central de Ajuda — Fanfarra" }] }),
  component: HelpPage,
});

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Importar obras por link",
    items: [
      {
        q: "De quais sites eu consigo importar automaticamente?",
        a: (
          <>
            AO3, Wattpad, Spirit Fanfics, Fanfiction.net, MyAnimeList, AniList, Google Books,
            Spotify, Steam e MyDramaList têm leitura automática — é só colar o link. Pra qualquer
            outro site, tentamos pegar título e capa genéricos da página; se não der certo, é só
            preencher manualmente.
          </>
        ),
      },
      {
        q: "Colei o link e não veio nenhuma informação. O que houve?",
        a: (
          <>
            Geralmente é um destes três motivos: (1) a página mudou de layout do lado de lá e
            nosso leitor não reconheceu mais os campos, (2) o link é de um site que carrega o
            conteúdo todo via JavaScript (o MANGA Plus é um exemplo conhecido — nesses casos,
            procure a mesma obra no MyAnimeList/AniList e importe de lá), ou (3) a obra é privada,
            trancada por senha ou exige login pra ver. Em qualquer um desses casos, dá pra
            preencher os campos manualmente sem problema.
          </>
        ),
      },
      {
        q: "Por que apareceu 'Muitas importações em pouco tempo'?",
        a: (
          <>
            É um limite de segurança: até 20 importações a cada 10 minutos por conexão, pra
            evitar abuso. Espere o tempo indicado na mensagem e tente de novo.
          </>
        ),
      },
    ],
  },
  {
    title: "Conta e privacidade",
    items: [
      {
        q: "Como eu excluo minha conta?",
        a: (
          <>
            Vá em <b>Configurações → Excluir conta</b>. A exclusão é definitiva: apaga obras,
            prateleiras, amizades, seguidores, chats, notificações e a própria conta de login —
            não tem como desfazer depois.
          </>
        ),
      },
      {
        q: "Minha conta é de uma pessoa menor de idade. Por que algumas opções estão bloqueadas?",
        a: (
          <>
            Contas cadastradas como de menores de 12 anos ficam automaticamente privadas e sem
            pedidos de amizade/conversa por segurança — isso não pode ser desligado pela tela de
            Configurações, é uma proteção permanente da conta.
          </>
        ),
      },
      {
        q: "Quem consegue ver meu perfil e me adicionar?",
        a: (
          <>
            Em <b>Configurações → Privacidade</b> dá pra escolher se seu perfil é público ou só
            pra amigos, quem pode te seguir e quem pode te enviar pedido de amizade.
          </>
        ),
      },
    ],
  },
  {
    title: "Notificações",
    items: [
      {
        q: "Como eu paro de receber um tipo específico de notificação?",
        a: (
          <>
            Em <b>Configurações → Notificações</b> dá pra ligar/desligar por categoria: pedidos de
            amizade, mensagens, Awards/desafios, lembretes de obras paradas, novo
            episódio/capítulo e novidades do app.
          </>
        ),
      },
    ],
  },
  {
    title: "Fanfarra PRO",
    items: [
      {
        q: "O que muda com o PRO?",
        a: (
          <>
            Estatísticas avançadas, Wrapped anual, coleções públicas, temas exclusivos, badge PRO
            no perfil e mais. Dá pra ver a lista completa em{" "}
            <Link to="/pro" style={{ color: "var(--fan-pink-light)" }}>
              Configurações → Fanfarra PRO
            </Link>
            .
          </>
        ),
      },
    ],
  },
];

function HelpPage() {
  const nav = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/settings" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Central de Ajuda
        </h1>
        <span className="w-6" />
      </header>

      <div className="flex flex-col items-center px-4 pt-1 pb-4 text-center">
        <HelpCircle size={26} color="var(--fan-icon-blue)" />
        <p className="text-sm mt-2" style={{ color: "var(--fan-text-2)" }}>
          Respostas rápidas pras dúvidas mais comuns. Não achou a sua?{" "}
          <Link to="/feedback" style={{ color: "var(--fan-pink-light)" }}>
            Fale com a gente
          </Link>
          .
        </p>
      </div>

      <div className="px-4 pb-10 space-y-6">
        {FAQ_GROUPS.map((group) => (
          <div key={group.title}>
            <h3
              className="text-xs uppercase font-bold mb-2"
              style={{ color: "var(--fan-text-2)" }}
            >
              {group.title}
            </h3>
            <div
              className="rounded-[10px] overflow-hidden"
              style={{ border: "0.5px solid var(--fan-rose-mid)" }}
            >
              {group.items.map((item, i) => {
                const id = `${group.title}-${i}`;
                const open = openId === id;
                return (
                  <div
                    key={id}
                    style={{
                      background: "var(--fan-bg-2)",
                      borderBottom:
                        i < group.items.length - 1 ? "0.5px solid var(--fan-border)" : undefined,
                    }}
                  >
                    <button
                      onClick={() => setOpenId(open ? null : id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: "var(--fan-text)" }}
                      >
                        {item.q}
                      </span>
                      <ChevronDown
                        size={18}
                        color="var(--fan-text-2)"
                        style={{
                          transform: open ? "rotate(180deg)" : "none",
                          transition: "transform 0.15s ease",
                          flexShrink: 0,
                        }}
                      />
                    </button>
                    {open && (
                      <p
                        className="px-4 pb-4 text-sm leading-relaxed"
                        style={{ color: "var(--fan-text-2)" }}
                      >
                        {item.a}
                      </p>
                    )}
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