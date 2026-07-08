import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Política de Privacidade — Fanfarra" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
          Política de Privacidade
        </h1>
      </header>

      <div
        className="px-5 pb-16 text-[13px] leading-relaxed"
        style={{ color: "var(--fan-text-2)" }}
      >
        <p className="mb-4" style={{ color: "var(--fan-text-3)" }}>
          Última atualização: 6 de julho de 2026
        </p>

        <p className="mb-4">
          Esta Política de Privacidade explica como o Fanfarra ("nós", "app") coleta, usa e protege
          as informações dos usuários ("você"). Ao criar uma conta ou usar o Fanfarra, você concorda
          com as práticas descritas aqui.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          1. Quais dados coletamos
        </h2>
        <p className="mb-2">Coletamos os seguintes dados quando você usa o Fanfarra:</p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>
            <b>Dados de conta:</b> e-mail, nome de usuário e senha (a senha nunca é armazenada por
            nós — ela é gerenciada pelo Firebase Authentication, do Google).
          </li>
          <li>
            <b>Login social:</b> se você entrar com Google, recebemos seu e-mail e nome público
            associados à conta Google.
          </li>
          <li>
            <b>Conteúdo que você cria:</b> obras cadastradas (fanfics, mangás, etc.), avaliações,
            coleções, tags, conquistas e demais dados que você insere no app.
          </li>
          <li>
            <b>Imagens:</b> capas e imagens que você envia são armazenadas em um serviço externo
            (ImgBB) e vinculadas ao seu conteúdo.
          </li>
          <li>
            <b>Dados técnicos:</b> registros de erro do app (para identificar e corrigir problemas),
            que podem incluir informações sobre o dispositivo e a ação que causou o erro.
          </li>
        </ul>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          2. Como usamos seus dados
        </h2>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>Criar e manter sua conta e permitir o login;</li>
          <li>Salvar e exibir o conteúdo que você cadastra no app;</li>
          <li>
            Enviar e-mails necessários ao funcionamento da conta (verificação de e-mail, redefinição
            de senha);
          </li>
          <li>Identificar e corrigir erros técnicos;</li>
          <li>Cumprir obrigações legais, quando aplicável.</li>
        </ul>
        <p className="mb-4">Não vendemos seus dados pessoais e não os usamos para publicidade.</p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          3. Com quem compartilhamos dados
        </h2>
        <p className="mb-2">Usamos os seguintes serviços de terceiros para operar o Fanfarra:</p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>
            <b>Firebase (Google):</b> autenticação e armazenamento do banco de dados (Firestore).
          </li>
          <li>
            <b>ImgBB:</b> hospedagem das imagens enviadas por usuários.
          </li>
        </ul>
        <p className="mb-4">
          Esses serviços têm suas próprias políticas de privacidade e podem processar dados fora do
          Brasil. Não compartilhamos seus dados com terceiros para fins de marketing.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          4. Seus direitos (LGPD)
        </h2>
        <p className="mb-2">
          De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>Confirmar se tratamos seus dados e acessá-los;</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>Solicitar a exclusão dos seus dados e da sua conta;</li>
          <li>Solicitar a portabilidade dos seus dados;</li>
          <li>Revogar o consentimento dado, quando aplicável.</li>
        </ul>
        <p className="mb-4">
          Para exercer qualquer um desses direitos, entre em contato pelo e-mail{" "}
          <a href="mailto:privacidade@fanfarra.app" style={{ color: "var(--fan-pink-light)" }}>
            privacidade@fanfarra.app
          </a>
          .
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          5. Exclusão de conta
        </h2>
        <p className="mb-4">
          Você pode solicitar a exclusão da sua conta e de todos os dados associados a qualquer
          momento, entrando em contato pelo e-mail acima. A exclusão é permanente e não pode ser
          desfeita.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          6. Segurança
        </h2>
        <p className="mb-4">
          Adotamos medidas técnicas razoáveis para proteger seus dados, mas nenhum sistema é 100%
          seguro. Recomendamos usar uma senha forte e não compartilhá-la com terceiros.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          7. Crianças e adolescentes
        </h2>
        <p className="mb-4">
          O Fanfarra não é direcionado a menores de 13 anos. Se você tem entre 13 e 18 anos,
          recomendamos o uso com a orientação de um responsável.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          8. Alterações nesta política
        </h2>
        <p className="mb-4">
          Podemos atualizar esta política periodicamente. Mudanças relevantes serão comunicadas
          dentro do app.
        </p>

        <h2 className="font-bold mt-6 mb-2" style={{ color: "var(--fan-text)" }}>
          9. Contato
        </h2>
        <p className="mb-4">
          Dúvidas sobre esta política? Escreva para{" "}
          <a href="mailto:privacidade@fanfarra.app" style={{ color: "var(--fan-pink-light)" }}>
            privacidade@fanfarra.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}
