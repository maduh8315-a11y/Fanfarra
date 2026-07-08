import { useState } from "react";
import { Star } from "lucide-react";
import { MEDIA_TYPES, STATUSES, type MediaType, type Status } from "@/lib/fanfarra/types";

export const SORT_OPTIONS = [
  "Recentes",
  "A–Z",
  "Z–A",
  "Melhor avaliação",
  "Mais progresso",
  "Data de início",
  "Data de conclusão",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export interface LibraryFilters {
  sort: SortOption;
  statuses: Status[];
  types: MediaType[];
  minRating: number;
}

export const DEFAULT_FILTERS: LibraryFilters = {
  sort: "Recentes",
  statuses: [],
  types: [],
  minRating: 0,
};

export function FilterSheet({
  open,
  initial,
  onClose,
  onApply,
}: {
  open: boolean;
  initial: LibraryFilters;
  onClose: () => void;
  onApply: (f: LibraryFilters) => void;
}) {
  const [f, setF] = useState<LibraryFilters>(initial);

  if (!open) return null;

  const toggleStatus = (s: Status) =>
    setF((p) => ({
      ...p,
      statuses: p.statuses.includes(s) ? p.statuses.filter((x) => x !== s) : [...p.statuses, s],
    }));
  const toggleType = (t: MediaType) =>
    setF((p) => ({
      ...p,
      types: p.types.includes(t) ? p.types.filter((x) => x !== t) : [...p.types, t],
    }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl p-5"
        style={{ background: "var(--fan-bg)", border: "0.5px solid var(--fan-rose-mid)" }}
      >
        <div className="flex justify-center mb-3">
          <span className="block w-8 h-1 rounded-full" style={{ background: "var(--fan-rose-mid)" }} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--fan-text)" }}>
            Filtrar e ordenar
          </h2>
          <button
            onClick={() => setF(DEFAULT_FILTERS)}
            className="text-[12px]"
            style={{ color: "var(--fan-pink)" }}
          >
            Limpar tudo
          </button>
        </div>

        <Section label="Ordenar por">
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setF((p) => ({ ...p, sort: s }))}
                className={`fan-chip ${f.sort === s ? "fan-chip-active" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Status">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`fan-chip ${f.statuses.includes(s) ? "fan-chip-active" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Tipo de mídia">
          <div className="flex flex-wrap gap-2">
            {MEDIA_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`fan-chip ${f.types.includes(t) ? "fan-chip-active" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Avaliação mínima">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setF((p) => ({ ...p, minRating: n === p.minRating ? 0 : n }))}
              >
                <Star
                  size={24}
                  color={n <= f.minRating ? "var(--fan-pink-light)" : "var(--fan-rose-mid)"}
                  fill={n <= f.minRating ? "var(--fan-pink-light)" : "transparent"}
                />
              </button>
            ))}
          </div>
        </Section>

        <button
          onClick={() => {
            onApply(f);
            onClose();
          }}
          className="fan-btn-primary w-full text-sm mt-2"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] uppercase mb-2 font-bold" style={{ color: "var(--fan-text-2)" }}>
        {label}
      </h3>
      {children}
    </div>
  );
}

export function applyFilters<
  T extends {
    status: Status;
    type: MediaType;
    rating: number;
    title: string;
    updatedAt: number;
    current: number;
    total: number;
    startDate?: { y?: number; m?: number; d?: number };
    endDate?: { y?: number; m?: number; d?: number };
  },
>(items: T[], f: LibraryFilters): T[] {
  const dateNum = (d?: { y?: number; m?: number; d?: number }) =>
    d ? (d.y ?? 0) * 10000 + (d.m ?? 0) * 100 + (d.d ?? 0) : 0;
  let out = items.filter((w) => {
    if (f.statuses.length && !f.statuses.includes(w.status)) return false;
    if (f.types.length && !f.types.includes(w.type)) return false;
    if (f.minRating && w.rating < f.minRating) return false;
    return true;
  });
  out = [...out].sort((a, b) => {
    switch (f.sort) {
      case "A–Z":
        return a.title.localeCompare(b.title);
      case "Z–A":
        return b.title.localeCompare(a.title);
      case "Melhor avaliação":
        return b.rating - a.rating;
      case "Mais progresso": {
        const ap = a.total > 0 ? a.current / a.total : 0;
        const bp = b.total > 0 ? b.current / b.total : 0;
        return bp - ap;
      }
      case "Data de início":
        return dateNum(b.startDate) - dateNum(a.startDate);
      case "Data de conclusão":
        return dateNum(b.endDate) - dateNum(a.endDate);
      default:
        return b.updatedAt - a.updatedAt;
    }
  });
  return out;
}
