import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { MEDIA_TYPES, MEDIA_MODES, MODE_OF_TYPE, MODE_ICONS, MODE_LABELS, type MediaType, type MediaMode } from "@/lib/fanfarra/types";

export const Route = createFileRoute("/add/")({
  head: () => ({ meta: [{ title: "Adicionar obra — Fanfarra" }] }),
  component: AddIndex,
});

// "Gacha Videos" não aparece como card próprio — é acessado deslizando
// pra esquerda a partir do card "Vídeos" (ver src/routes/add.$type.tsx).
const HIDDEN_FROM_GRID = new Set(["Gacha Videos"]);

const TYPES_BY_MODE: Record<MediaMode, MediaType[]> = MEDIA_MODES.reduce(
  (acc, m) => {
    acc[m] = MEDIA_TYPES.filter((t) => !HIDDEN_FROM_GRID.has(t) && MODE_OF_TYPE[t] === m);
    return acc;
  },
  {} as Record<MediaMode, MediaType[]>,
);

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

      <div className="px-4 mt-3 flex flex-col gap-6 pb-6">
        {MEDIA_MODES.map((m) => (
          <section key={m}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[15px]" aria-hidden>
                {MODE_ICONS[m]}
              </span>
              <h2
                className="text-[12px] font-bold uppercase tracking-wide"
                style={{ color: "var(--fan-text-2)" }}
              >
                {MODE_LABELS[m]}
              </h2>
              <div className="flex-1 h-px" style={{ background: "var(--fan-border)" }} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {TYPES_BY_MODE[m].map((t) => (
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
          </section>
        ))}
      </div>
    </AppShell>
  );
}