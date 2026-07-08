import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { MEDIA_TYPES } from "@/lib/fanfarra/types";

export const Route = createFileRoute("/add/")({
  head: () => ({ meta: [{ title: "Adicionar obra — Fanfarra" }] }),
  component: AddIndex,
});

// "Gacha Videos" não aparece como card próprio — é acessado deslizando
// pra esquerda a partir do card "Vídeos" (ver src/routes/add.$type.tsx).
const HIDDEN_FROM_GRID = new Set(["Gacha Videos"]);

function AddIndex() {
  const nav = useNavigate();
  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="w-6" />
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          O que quer adicionar?
        </h1>
        <button onClick={() => nav({ to: "/" })} aria-label="Fechar">
          <X size={22} color="var(--fan-text-2)" />
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3 px-4 mt-3">
        {MEDIA_TYPES.filter((t) => !HIDDEN_FROM_GRID.has(t)).map((t) => (
          <Link
            key={t}
            to="/add/$type"
            params={{ type: t }}
            className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-[12px] active:scale-95 transition"
            style={{
              background: "var(--fan-bg-2)",
              border: "0.5px solid var(--fan-rose-mid)",
            }}
          >
            {t === "Vídeos" && (
              <span className="absolute top-2 right-2 flex gap-0.5" aria-hidden>
                <span className="rounded-full" style={{ width: 4, height: 4, background: "var(--fan-pink)" }} />
                <span className="rounded-full" style={{ width: 4, height: 4, background: "var(--fan-rose-mid)" }} />
              </span>
            )}
            <MediaIcon type={t} size={28} className="text-[var(--fan-pink)]" />
            <span
              className="text-[11px] font-bold text-center"
              style={{ color: "var(--fan-text-3)" }}
            >
              {t}
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}