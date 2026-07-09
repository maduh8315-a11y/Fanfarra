import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export default function WrappedPaywall() {
  const nav = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 32px",
        background: "var(--fan-bg)",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle, var(--fan-active-chip) 0%, var(--fan-bg-2) 70%)",
          border: "1px solid var(--fan-rose-mid)",
          marginBottom: 20,
        }}
      >
        <Sparkles size={32} color="var(--fan-pink-light)" fill="var(--fan-pink-light)" />
      </div>
      <h2 style={{ color: "var(--fan-text)", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        O resto do seu Wrapped é PRO ✦
      </h2>
      <p style={{ color: "var(--fan-text-2)", fontSize: 13, maxWidth: 280, marginBottom: 24 }}>
        Assine o Fanfarra PRO pra ver seus gêneros favoritos, estatísticas completas, streak e
        conquistas do ano.
      </p>
      <button
        onClick={() => nav({ to: "/pro" })}
        style={{
          padding: "12px 28px",
          borderRadius: 999,
          border: "none",
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
          background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))",
        }}
      >
        Ver o Fanfarra PRO
      </button>
    </div>
  );
}