import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthInput, FanfarraLogo, GoogleIcon } from "@/components/fanfarra/auth/AuthInput";
import { signInWithEmail, signInWithGoogle, authErrorMessage } from "@/lib/fanfarra/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email) errs.email = "Campo obrigatório.";
    if (!password) errs.password = "Campo obrigatório.";
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      navigate({ to: "/" });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setErrors({ password: authErrorMessage(code) });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate({ to: "/" });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setErrors({ form: authErrorMessage(code) });
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div
      className="min-h-dvh px-6"
      style={{ background: "var(--fan-bg)", paddingBottom: "calc(2.5rem + var(--sab))" }}
    >
      <div className="pt-12 text-center">
        <FanfarraLogo size={22} />
        <p className="mt-1 text-base" style={{ color: "var(--fan-text)" }}>
          Bem-vindo de volta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-9 space-y-4">
        <AuthInput
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <AuthInput
          label="Senha"
          togglePassword
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <button
          type="submit"
          disabled={loading}
          className="fan-btn-primary w-full flex items-center justify-center"
          style={{ height: 50, fontSize: 15, marginTop: 24 }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" color="white" /> : "Entrar"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--fan-border)" }} />
        <span className="text-[11px]" style={{ color: "var(--fan-rose-mid)" }}>
          ou
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--fan-border)" }} />
      </div>

      {errors.form && (
        <p className="text-center text-[12px] mb-3" style={{ color: "#F87171" }}>
          {errors.form}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2.5 rounded-full"
        style={{
          height: 50,
          background: "var(--fan-bg-2)",
          border: "1px solid var(--fan-rose-mid)",
          color: "var(--fan-text)",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
        Entrar com Google
      </button>

      <div className="mt-8 text-center">
        <p className="text-[13px]" style={{ color: "var(--fan-text-2)" }}>
          Não tem conta?{" "}
          <Link to="/register" style={{ color: "var(--fan-pink-light)", fontWeight: 700 }}>
            Criar conta
          </Link>
        </p>
        <Link
          to="/forgot-password"
          className="inline-block mt-3 text-[12px]"
          style={{ color: "var(--fan-text-2)" }}
        >
          Esqueceu a senha?
        </Link>
      </div>
    </div>
  );
}
