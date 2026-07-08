import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle, KeyRound, Loader2 } from "lucide-react";
import { AuthInput } from "@/components/fanfarra/auth/AuthInput";
import { sendPasswordResetEmail, authErrorMessage } from "@/lib/fanfarra/auth";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!email) return setError("Campo obrigatório.");
    setError(undefined);
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setSent(true);
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code ?? ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-6 pb-10" style={{ background: "var(--fan-bg)" }}>
      <div className="pt-5 flex items-center gap-3">
        <Link to="/login" aria-label="Voltar">
          <ArrowLeft size={20} color="var(--fan-text-2)" />
        </Link>
        <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
          Esqueci a senha
        </span>
      </div>

      {!sent ? (
        <>
          <div className="mt-10 flex flex-col items-center text-center">
            <KeyRound size={48} color="var(--fan-pink-light)" />
            <h1 className="mt-4 text-xl font-extrabold" style={{ color: "var(--fan-text)" }}>
              Redefinir senha
            </h1>
            <p className="mt-2 text-[13px] max-w-xs" style={{ color: "var(--fan-text-2)" }}>
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <AuthInput
              label="E-mail"
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />
            <button
              type="submit"
              disabled={loading}
              className="fan-btn-primary w-full flex items-center justify-center"
              style={{ height: 50, fontSize: 15 }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" color="white" />
              ) : (
                "Enviar link de redefinição"
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-[13px]" style={{ color: "var(--fan-text-2)" }}>
            Lembrou a senha?{" "}
            <Link to="/login" style={{ color: "var(--fan-pink-light)", fontWeight: 700 }}>
              Entrar
            </Link>
          </p>
        </>
      ) : (
        <div className="mt-12 flex flex-col items-center text-center">
          <CheckCircle size={48} color="#4ADE80" />
          <h1 className="mt-4 text-xl font-extrabold" style={{ color: "var(--fan-text)" }}>
            Link enviado!
          </h1>
          <p className="mt-2 text-[13px] max-w-xs" style={{ color: "var(--fan-text-2)" }}>
            Confira seu e-mail (inclusive spam) e siga as instruções para redefinir.
          </p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-8 w-full rounded-full"
            style={{
              height: 50,
              background: "var(--fan-bg-2)",
              border: "1px solid var(--fan-rose-mid)",
              color: "var(--fan-text)",
              fontWeight: 600,
            }}
          >
            Voltar para Login
          </button>
        </div>
      )}
    </div>
  );
}
