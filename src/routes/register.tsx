import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AuthInput, FanfarraLogo } from "@/components/fanfarra/auth/AuthInput";
import { signUpWithEmail, authErrorMessage } from "@/lib/fanfarra/auth";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10 || /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}

function StrengthBar({ pw }: { pw: string }) {
  const s = passwordStrength(pw);
  if (!pw) return null;
  const colors = ["#F87171", "#F87171", "#F59E0B", "#4ADE80"];
  const labels = ["Fraca", "Fraca", "Razoável", "Forte"];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{ height: 4, background: i <= s ? colors[s] : "var(--fan-border)" }}
          />
        ))}
      </div>
      <p className="mt-1 text-sm" style={{ color: colors[s] }}>
        {labels[s]}
      </p>
    </div>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [birthDate, setBirthDate] = useState("");

  const validate = useMemo(
    () => () => {
      const e: Record<string, string> = {};
      if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
        e.username = "Use apenas letras, números e _ (mín. 3 caracteres).";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Informe um e-mail válido.";
      if (password.trim().length < 6) e.password = "Mínimo de 6 caracteres.";
      if (confirm.trim() !== password.trim()) e.confirm = "As senhas não coincidem.";
      if (!birthDate) {
        e.birthDate = "Informe sua data de nascimento.";
      } else if (new Date(birthDate) > new Date()) {
        e.birthDate = "Data de nascimento inválida.";
      }
      return e;
    },
    [username, email, password, confirm, birthDate],
  );

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) return setErrors(e);
    setErrors({});
    setLoading(true);
    try {
      await signUpWithEmail(email, password, username, birthDate);
      navigate({ to: "/verify-email", replace: true });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setErrors({ email: "Este e-mail já está em uso. Tente fazer login." });
      } else {
        setErrors({ form: authErrorMessage(code) });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh px-6 pb-10" style={{ background: "var(--fan-bg)" }}>
      <div className="pt-5">
        <Link to="/login" aria-label="Voltar">
          <ArrowLeft size={20} color="var(--fan-text-2)" />
        </Link>
      </div>
      <div className="mt-6 text-center">
        <FanfarraLogo size={22} />
        <p className="mt-1 text-base" style={{ color: "var(--fan-text)" }}>
          Crie sua conta
        </p>
      </div>
      <div className="mt-7 space-y-4">
        <AuthInput
          label="Nome de usuário"
          placeholder="seu_nick"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
        />
        <AuthInput
        label="Data de nascimento"
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        error={errors.birthDate}
        max={new Date().toISOString().split("T")[0]}
      />
        <AuthInput
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <div>
          <AuthInput
            label="Senha"
            togglePassword
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <StrengthBar pw={password} />
        </div>
        <AuthInput
          label="Confirmar senha"
          togglePassword
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        {errors.form && (
          <p className="text-sm text-center" style={{ color: "#F87171" }}>
            {errors.form}
          </p>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="fan-btn-primary w-full flex items-center justify-center"
          style={{ height: 52, fontSize: 15, marginTop: 16 }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" color="white" /> : "Criar conta"}
        </button>
      </div>
      <p className="mt-6 text-center text-sm" style={{ color: "var(--fan-text-2)" }}>
        Já tem conta?{" "}
        <Link to="/login" style={{ color: "var(--fan-pink-light)", fontWeight: 700 }}>
          Entrar
        </Link>
      </p>
    </div>
  );
}
