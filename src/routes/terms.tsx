import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Termos de Uso — Fanfarra" }] }),
  component: TermsPage,
});

function TermsPage() {
  const nav = useNavigate();
  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh", background: "var(--fan-bg)" }}>
      <header
        className="flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 z-10"
        style={{ background: "var(--fan-bg)" }}
      >
        <button onClick={() => nav({ to: "/about" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Termos de Uso
        </h1>
      </header>

      <div
        className="px-5 pb-16 text-sm leading-relaxed"
        style={{ color: "var(--fan-text-2)" }}
      >
        <p className="mb-4" style={{ color: "var(--fan-text-3)" }}>
          Última atualização: 6 de julho de 2026
        </p>

        <p className="mb-4">
          Ao criar uma conta ou usar o Fanfarra, você concorda com estes Termos de Uso. Leia com
          atenção antes de continuar.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          1. Sobre o Fanfarra
        </h2>
        <p className="mb-4">
          O Fanfarra é um aplicativo para organizar e acompanhar seu consumo de conteúdo fandom
          (fanfics, mangás, animes, séries e afins), incluindo listas, avaliações, conquistas e
          recomendações.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          2. Cadastro e conta
        </h2>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>Você é responsável por manter a confidencialidade da sua senha;</li>
          <li>Você é responsável por todas as atividades realizadas na sua conta;</li>
          <li>As informações fornecidas no cadastro devem ser verdadeiras;</li>
          <li>Nos reservamos o direito de suspender contas que violem estes termos.</li>
        </ul>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          3. Conteúdo enviado pelo usuário
        </h2>
        <p className="mb-2">
          Ao cadastrar obras, imagens, avaliações ou qualquer outro conteúdo no Fanfarra, você
          declara que:
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>
            Tem o direito de compartilhar esse conteúdo (por exemplo, imagens de capa de uso público
            ou que você tem permissão para usar);
          </li>
          <li>
            Não vai enviar conteúdo ilegal, ofensivo, discriminatório ou que infrinja direitos
            autorais de terceiros;
          </li>
          <li>
            Entende que links importados de terceiros (ex: import por URL) são apenas referências, e
            o Fanfarra não hospeda nem se responsabiliza pelo conteúdo original desses links.
          </li>
        </ul>
        <p className="mb-4">
          Nos reservamos o direito de remover qualquer conteúdo que viole estes termos, sem aviso
          prévio.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          4. Uso aceitável
        </h2>
        <p className="mb-2">Você concorda em não:</p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>
            Automatizar chamadas ao app (bots, scripts) de forma abusiva, incluindo o recurso de
            importar links ou de upload de imagens;
          </li>
          <li>Tentar acessar dados de outros usuários sem autorização;</li>
          <li>Usar o app para fins ilegais ou que prejudiquem terceiros.</li>
        </ul>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          5. Serviços de terceiros
        </h2>
        <p className="mb-4">
          O Fanfarra utiliza serviços de terceiros (Firebase/Google e ImgBB) para funcionar. A
          disponibilidade do app pode ser afetada por instabilidades desses serviços, e não nos
          responsabilizamos por falhas fora do nosso controle.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          6. Cancelamento
        </h2>
        <p className="mb-4">
          Você pode parar de usar o Fanfarra e solicitar a exclusão da sua conta a qualquer momento.
          Também podemos suspender ou encerrar contas que violem estes termos.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          7. Isenção de garantias
        </h2>
        <p className="mb-4">
          O Fanfarra é fornecido "como está", sem garantias de disponibilidade ininterrupta ou
          ausência de erros. Fazemos o possível para manter o app funcionando bem, mas não
          garantimos que estará livre de falhas.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          8. Alterações nestes termos
        </h2>
        <p className="mb-4">
          Podemos atualizar estes termos periodicamente. Mudanças relevantes serão comunicadas
          dentro do app.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          9. Contato
        </h2>
        <p className="mb-4">
          Dúvidas sobre estes termos? Escreva para{" "}
          <a href="mailto:contato@fanfarra.app" style={{ color: "var(--fan-pink-light)" }}>
            contato@fanfarra.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}
