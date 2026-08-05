import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/fanfarra/AppShell";
import { sendFeedback } from "@/lib/fanfarra/feedback";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Enviar feedback — Fanfarra" }] }),
  component: FeedbackPage,
});

const TYPES = [
  { id: "bug", label: "Bug" },
  { id: "sugestao", label: "Sugestão" },
  { id: "outro", label: "Outro" },
] as const;

function FeedbackPage() {
  const nav = useNavigate();
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (message.trim().length < 5) {
      toast.error("Escreve um pouco mais pra gente entender melhor 🙂");
      return;
    }
    setSending(true);
    try {
      await sendFeedback({ type, message: message.trim() });
      toast.success("Feedback enviado! Obrigado por ajudar a melhorar o Fanfarra 💛");
      setMessage("");
      nav({ to: "/settings" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/settings" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Enviar feedback
        </h1>
        <span className="w-6" />
      </header>

      <div className="px-4 pt-2 pb-10 flex flex-col gap-4">
        <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
          Achou um bug ou tem uma ideia pro app? Manda aqui — a mensagem vai direto pra gente.
        </p>

        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className="flex-1 px-3 py-2.5 rounded-[10px] text-sm font-bold"
              style={{
                background: type === t.id ? "var(--fan-active-chip)" : "var(--fan-bg-2)",
                border: `1px solid ${type === t.id ? "var(--fan-pink)" : "var(--fan-border)"}`,
                color: type === t.id ? "var(--fan-pink-light)" : "var(--fan-text-2)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Descreva com o máximo de detalhes possível..."
          rows={6}
          maxLength={1000}
          className="w-full rounded-[12px] p-3 text-sm resize-none"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)", color: "var(--fan-text)" }}
        />
        <span className="text-xs text-right" style={{ color: "var(--fan-text-2)" }}>
          {message.length}/1000
        </span>

        <button
          onClick={handleSubmit}
          disabled={sending}
          className="fan-btn-primary flex items-center justify-center gap-2"
        >
          <Send size={16} />
          {sending ? "Enviando..." : "Enviar feedback"}
        </button>
      </div>
    </AppShell>
  );
}