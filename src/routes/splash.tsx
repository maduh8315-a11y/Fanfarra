import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { FanfarraLogo } from "@/components/fanfarra/auth/AuthInput";
import { useAuthReady, useAuthUser } from "@/lib/fanfarra/auth";

export const Route = createFileRoute("/splash")({
  component: SplashPage,
});

function SplashPage() {
  const navigate = useNavigate();
  const authReady = useAuthReady();
  const user = useAuthUser();

  useEffect(() => {
    if (!authReady) return; // espera o Firebase confirmar se há sessão salva no dispositivo

    const t = setTimeout(() => {
      if (user) {
        navigate({ to: "/" });
        return;
      }
      const onboarded =
        typeof window !== "undefined" && localStorage.getItem("fanfarra:onboarding_done") === "1";
      navigate({ to: onboarded ? "/login" : "/onboarding" });
    }, 1500);

    return () => clearTimeout(t);
  }, [navigate, authReady, user]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--fan-bg)" }}
    >
      <FanfarraLogo size={26} />
      <p className="mt-2 text-[13px]" style={{ color: "var(--fan-text-2)" }}>
        Seu universo fandom
      </p>
      <div
        className="mt-8 overflow-hidden"
        style={{ width: 80, height: 3, borderRadius: 99, background: "var(--fan-border)" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "var(--fan-pink)",
            transformOrigin: "left",
            animation: "splashProgress 1.5s linear forwards",
          }}
        />
      </div>
      <style>{`
        @keyframes splashProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
