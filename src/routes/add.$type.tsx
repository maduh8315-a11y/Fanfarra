import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type TouchEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { WorkForm, formValuesToWork } from "@/components/fanfarra/forms/WorkForm";
import { addWork } from "@/lib/fanfarra/store";
import { addWorkToShelf } from "@/lib/fanfarra/bookcaseStore";
import { MEDIA_TYPES, DEFAULT_STATUS_FOR_TYPE, type MediaType } from "@/lib/fanfarra/types";
import { ClientOnly } from "@/components/fanfarra/ClientOnly";

export const Route = createFileRoute("/add/$type")({
  head: () => ({ meta: [{ title: "Adicionar obra — Fanfarra" }] }),
  validateSearch: (search: Record<string, unknown>): { title?: string } => {
    return typeof search.title === "string" && search.title.trim()
      ? { title: search.title }
      : {};
  },
  component: AddTypePage,
});

// "Vídeos" e "Gacha Videos" dividem a mesma tela, navegável arrastando
// pra esquerda/direita — ver VideosAddPager mais abaixo.
const VIDEO_PAGES: { type: MediaType; label: string }[] = [
  { type: "Vídeos", label: "Vídeos" },
  { type: "Gacha Videos", label: "Gacha Videos" },
];

// Monta os valores iniciais do formulário já com o título vindo da busca,
// evitando que o usuário precise digitar o nome da obra de novo.
function buildInitialFromTitle(type: MediaType, title?: string) {
  if (!title) return undefined;
  return {
    title,
    status: DEFAULT_STATUS_FOR_TYPE(type),
    cover: "",
    rating: 0,
    notes: "",
    genres: [],
    details: {},
    shelfEntries: [],
  };
}

function AddTypePage() {
  const { type } = Route.useParams();
  const { title } = Route.useSearch();
  const nav = useNavigate();
  const valid = (MEDIA_TYPES as readonly string[]).includes(type);

  if (!valid) {
    return (
      <AppShell>
        <div className="p-10 text-center" style={{ color: "var(--fan-text-2)" }}>
          Tipo desconhecido.
        </div>
      </AppShell>
    );
  }
  const mediaType = type as MediaType;


  const isVideoFlow = VIDEO_PAGES.some((p) => p.type === mediaType);
  if (isVideoFlow) {
    return <VideosAddPager initialType={mediaType} />;
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/add" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Adicionar {mediaType}
        </h1>
        <span className="w-6" />
      </header>

      <ClientOnly>
        <WorkForm
          type={mediaType}
          initial={buildInitialFromTitle(mediaType, title)}
          submitLabel="Salvar obra"
          onSubmit={(v) => {
            const w = addWork(formValuesToWork(mediaType, v));
            for (const entry of v.shelfEntries) {
              addWorkToShelf(entry.bookcaseId, entry.shelfId, w.id);
            }
            nav({ to: "/work/$id", params: { id: w.id } });
          }}
        />
      </ClientOnly>
    </AppShell>
  );
}

// ===== Vídeos / Gacha Videos — mesma tela, 2 páginas deslizáveis =====

function VideosAddPager({ initialType }: { initialType: MediaType }) {
  const nav = useNavigate();
  const { title } = Route.useSearch();
  const [idx, setIdx] = useState(() => {
    const found = VIDEO_PAGES.findIndex((p) => p.type === initialType);
    return found === -1 ? 0 : found;
  });
  const touchStart = useRef<number | null>(null);

  const go = (next: number) => setIdx(Math.min(VIDEO_PAGES.length - 1, Math.max(0, next)));

  const onTouchStart = (e: TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    touchStart.current = null;
  };

  const current = VIDEO_PAGES[idx];

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/add" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Adicionar {current.label}
        </h1>
        <span className="w-6" />
      </header>

      {/* Indicador de página (bolinhas, tipo carrossel) */}
      <div className="flex justify-center items-center gap-1.5 pb-1">
        {VIDEO_PAGES.map((p, i) => (
          <button
            key={p.type}
            onClick={() => go(i)}
            aria-label={`Ir para ${p.label}`}
            className="rounded-full transition-all"
            style={{
              width: i === idx ? 18 : 6,
              height: 6,
              background: i === idx ? "var(--fan-pink)" : "var(--fan-rose-mid)",
            }}
          />
        ))}
      </div>
      {idx === 0 && (
        <p className="text-center text-sm pb-2" style={{ color: "var(--fan-text-2)" }}>
          ◀ Deslize para o lado pra ver Gacha Videos
        </p>
      )}

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <ClientOnly>
          <WorkForm
            key={current.type}
            type={current.type}
            initial={buildInitialFromTitle(current.type, title)}
            submitLabel="Salvar obra"
            onSubmit={(v) => {
              const w = addWork(formValuesToWork(current.type, v));
              for (const entry of v.shelfEntries) {
                addWorkToShelf(entry.bookcaseId, entry.shelfId, w.id);
              }
              nav({ to: "/work/$id", params: { id: w.id } });
            }}
          />
        </ClientOnly>
      </div>
    </AppShell>
  );
}