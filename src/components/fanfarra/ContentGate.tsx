// src/components/fanfarra/ContentGate.tsx
import { useState } from "react";
import { ShieldAlert, Eye } from "lucide-react";
import { useProfile } from "@/lib/fanfarra/extras";
import { getContentGateLevel } from "@/lib/fanfarra/contentGate";
import { EmptyState } from "@/components/fanfarra/EmptyState";

export function ContentGate({
  contentWarnings,
  children,
}: {
  contentWarnings: string[] | undefined;
  children: React.ReactNode;
}) {
  const { birthDate } = useProfile();
  const level = getContentGateLevel(contentWarnings, birthDate);
  const [revealed, setRevealed] = useState(false);

  if (level === "clear" || revealed) return <>{children}</>;

  if (level === "blocked") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Conteúdo indisponível"
        description="Esse conteúdo não está disponível pra sua idade no momento."
        className="min-h-[60vh]"
      />
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8">
      <ShieldAlert size={40} color="var(--fan-pink)" className="mb-3" />
      <h2 className="text-base font-bold mb-2" style={{ color: "var(--fan-text)" }}>
        Aviso de conteúdo sensível
      </h2>
      <p className="text-sm mb-1" style={{ color: "var(--fan-text-2)" }}>
        Essa obra foi marcada com:
      </p>
      <div className="flex flex-wrap justify-center gap-2 my-3">
        {contentWarnings!.map((w) => (
          <span
            key={w}
            className="text-xs px-2.5 py-1 rounded-full"
            style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
          >
            {w}
          </span>
        ))}
      </div>
      <button
        onClick={() => setRevealed(true)}
        className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
        style={{ background: "var(--fan-pink)", color: "#fff" }}
      >
        <Eye size={16} /> Ver mesmo assim
      </button>
    </div>
  );
}