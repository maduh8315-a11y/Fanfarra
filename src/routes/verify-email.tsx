import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { checkEmailVerified, useAuthUser, sendEmailVerification } from "@/lib/fanfarra/auth";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleResend() {
    sendEmailVerification();
    setCooldown(60);
  }

  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  async function handleConfirmed() {
    setChecking(true);
    const verified = await checkEmailVerified();
    setChecking(false);
    if (verified) {
      navigate({ to: "/" });
    } else {
      setNotYet(true);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--fan-bg)" }}
    >
      <Mail size={56} color="var(--fan-pink-light)" />
      <h1 className="mt-4 text-xl font-extrabold" style={{ color: "var(--fan-text)" }}>
        Confirme seu e-mail
      </h1>
      <p className="mt-2 text-[13px] max-w-xs" style={{ color: "var(--fan-text-2)" }}>
        Enviamos um link de confirmação para{" "}
        <span style={{ color: "var(--fan-text)" }}>{user?.email ?? "seu e-mail"}</span>
      </p>

      <button
        onClick={handleConfirmed}
        className="fan-btn-primary w-full max-w-sm mt-8"
        style={{ height: 50, fontSize: 15 }}
      >
        Já confirmei — Continuar
      </button>
      {notYet && (
        <p className="mt-3 text-[12px]" style={{ color: "#F87171" }}>
          Ainda não encontramos a confirmação. Clique no link do e-mail e tente de novo.
        </p>
      )}

      <div className="w-full max-w-sm my-6 h-px" style={{ background: "var(--fan-border)" }} />

      <div className="w-full max-w-sm my-6 h-px" style={{ background: "var(--fan-border)" }} />

      <p className="text-[12px]" style={{ color: "var(--fan-text-2)" }}>
        Não recebeu?
      </p>
      <button
        onClick={handleResend}
        disabled={cooldown > 0}
        className="w-full max-w-sm mt-2 rounded-full"
        style={{
          height: 50,
          background: "var(--fan-bg-2)",
          border: "1px solid var(--fan-rose-mid)",
          color: "var(--fan-text-2)",
          opacity: cooldown > 0 ? 0.5 : 1,
        }}
      >
        {cooldown > 0 ? `Reenviar em ${cooldown}s…` : "Reenviar e-mail"}
      </button>

      <Link to="/register" className="mt-5 text-[12px]" style={{ color: "var(--fan-pink-light)" }}>
        Usar outro e-mail
      </Link>
    </div>
  );
}
