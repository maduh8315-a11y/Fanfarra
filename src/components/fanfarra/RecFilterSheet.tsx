import { useState } from "react";
import { Search, X, Star, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { MEDIA_TYPES } from "@/lib/fanfarra/types";
import { CATALOG } from "@/lib/fanfarra/recommendations";
import { TagInput } from "@/components/fanfarra/TagInput";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface RecFilters {
  query: string; // Qualquer campo
  types: string[]; // Tipo de obra
  title: string; // Título
  author: string; // Criador
  yearMin: string; // Ano de lançamento (de)
  yearMax: string; // Ano de lançamento (até)
  fandom: string; // Fandom
  minPopularity: number; // Popularidade mínima (0–5 estrelas mapeadas de 0–100)
  genres: string[]; // Tags / Gêneros
  statuses: string[]; // Status
}

export const DEFAULT_REC_FILTERS: RecFilters = {
  query: "",
  types: [],
  title: "",
  author: "",
  yearMin: "",
  yearMax: "",
  fandom: "",
  minPopularity: 0,
  genres: [],
  statuses: [],
};

// ── Helpers derivados do catálogo ──────────────────────────────────────────────

const ALL_GENRES = Array.from(new Set(CATALOG.flatMap((i) => i.genres))).sort();

const ALL_FANDOMS = Array.from(
  new Set(CATALOG.map((i) => i.fandom).filter(Boolean) as string[]),
).sort();

const ALL_STATUSES = ["Em andamento", "Concluído"];

// ── Função de filtro exportada ─────────────────────────────────────────────────

export function applyRecFilters<
  T extends {
    type: string;
    title: string;
    author: string;
    year: number;
    fandom?: string;
    popularity: number;
    genres: string[];
    status: string;
    synopsis: string;
  },
>(items: T[], f: RecFilters): T[] {
  const q = f.query.trim().toLowerCase();
  const popThreshold = f.minPopularity * 20; // estrelas 1–5 → 20–100

  return items.filter((item) => {
    if (q) {
      const haystack = [
        item.title,
        item.author,
        item.synopsis,
        item.type,
        item.fandom ?? "",
        ...item.genres,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.types.length && !f.types.includes(item.type)) return false;
    if (f.title.trim() && !item.title.toLowerCase().includes(f.title.trim().toLowerCase()))
      return false;
    if (f.author.trim() && !item.author.toLowerCase().includes(f.author.trim().toLowerCase()))
      return false;
    if (f.yearMin && item.year < Number(f.yearMin)) return false;
    if (f.yearMax && item.year > Number(f.yearMax)) return false;
    if (f.fandom && item.fandom?.toLowerCase() !== f.fandom.toLowerCase()) return false;
    if (f.minPopularity && item.popularity < popThreshold) return false;
    if (f.genres.length && !f.genres.every((g) => item.genres.includes(g))) return false;
    if (f.statuses.length && !f.statuses.includes(item.status)) return false;
    return true;
  });
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function RecFilterSheet({
  open,
  initial,
  onClose,
  onApply,
}: {
  open: boolean;
  initial: RecFilters;
  onClose: () => void;
  onApply: (f: RecFilters) => void;
}) {
  const [f, setF] = useState<RecFilters>(initial);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    busca: true,
    tipos: true,
    titulo: false,
    criador: false,
    ano: false,
    fandom: false,
    popularidade: true,
    generos: false,
    status: false,
  });

  if (!open) return null;

  const set = <K extends keyof RecFilters>(key: K, val: RecFilters[K]) =>
    setF((p) => ({ ...p, [key]: val }));

  const toggleArr = <K extends "types" | "genres" | "statuses">(key: K, val: string) =>
    setF((p) => ({
      ...p,
      [key]: (p[key] as string[]).includes(val)
        ? (p[key] as string[]).filter((x) => x !== val)
        : [...(p[key] as string[]), val],
    }));

  const toggleSection = (key: string) => setExpandedSections((p) => ({ ...p, [key]: !p[key] }));

  const activeCount = [
    f.query,
    f.title,
    f.author,
    f.yearMin,
    f.yearMax,
    f.fandom,
    ...f.types,
    ...f.genres,
    ...f.statuses,
    f.minPopularity > 0 ? "pop" : "",
  ].filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl"
        style={{ background: "var(--fan-bg)", border: "0.5px solid var(--fan-rose-mid)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <span className="block w-8 h-1 rounded-full" style={{ background: "var(--fan-rose-mid)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} color="var(--fan-pink-light)" />
            <h2 className="text-base font-bold" style={{ color: "var(--fan-text)" }}>
              Filtrar recomendações
            </h2>
            {activeCount > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--fan-pink)", color: "#fff" }}
              >
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setF(DEFAULT_REC_FILTERS)}
            className="text-[12px]"
            style={{ color: "var(--fan-pink)" }}
          >
            Limpar tudo
          </button>
        </div>

        <div className="px-5 pb-5 space-y-1">
          <CollapsibleSection
            label="Qualquer campo"
            sectionKey="busca"
            expanded={expandedSections}
            onToggle={toggleSection}
            hasValue={!!f.query}
          >
            <TextInput
              placeholder="Buscar em título, autor, sinopse, tags..."
              value={f.query}
              onChange={(v) => set("query", v)}
              icon={<Search size={12} color="var(--fan-text-2)" />}
            />
          </CollapsibleSection>

          <CollapsibleSection
            label="Tipo de obra"
            sectionKey="tipos"
            expanded={expandedSections}
            onToggle={toggleSection}
            hasValue={f.types.length > 0}
          >
            <div className="flex flex-wrap gap-2">
              {MEDIA_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  active={f.types.includes(t)}
                  onClick={() => toggleArr("types", t)}
                />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            label="Título"
            sectionKey="titulo"
            expanded={expandedSections}
            onToggle={toggleSection}
            hasValue={!!f.title}
          >
            <TextInput
              placeholder="Ex: Demon Slayer"
              value={f.title}
              onChange={(v) => set("title", v)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            label="Criador / Autor"
            sectionKey="criador"
            expanded={expandedSections}
            onToggle={toggleSection}
            hasValue={!!f.author}
          >
            <TextInput
              placeholder="Ex: Hajime Isayama"
              value={f.author}
              onChange={(v) => set("author", v)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            label="Ano de lançamento"
            sectionKey="ano"
            expanded={expandedSections}
            onToggle={toggleSection}
            hasValue={!!f.yearMin || !!f.yearMax}
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="De"
                value={f.yearMin}
                onChange={(e) => set("yearMin", e.target.value)}
                className="flex-1 px-3 py-2 rounded-[10px] text-[12px] outline-none"
                style={{
                  background: "var(--fan-bg-2)",
                  border: "1px solid var(--fan-border)",
                  color: "var(--fan-text)",
                }}
                min={1900}
                max={2030}
              />
              <span className="text-[11px]" style={{ color: "var(--fan-text-3)" }}>
                –
              </span>
              <input
                type="number"
                placeholder="Até"
                value={f.yearMax}
                onChange={(e) => set("yearMax", e.target.value)}
                className="flex-1 px-3 py-2 rounded-[10px] text-[12px] outline-none"
                style={{
                  background: "var(--fan-bg-2)",
                  border: "1px solid var(--fan-border)",
                  color: "var(--fan-text)",
                }}
                min={1900}
                max={2030}
              />
            </div>
          </CollapsibleSection>

          {ALL_FANDOMS.length > 0 && (
            <CollapsibleSection
              label="Fandom"
              sectionKey="fandom"
              expanded={expandedSections}
              onToggle={toggleSection}
              hasValue={!!f.fandom}
            >
              <div className="flex flex-wrap gap-2">
                {ALL_FANDOMS.map((fd) => (
                  <Chip
                    key={fd}
                    label={fd}
                    active={f.fandom === fd}
                    onClick={() => set("fandom", f.fandom === fd ? "" : fd)}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          <CollapsibleSection
            label="Popularidade mínima"
            sectionKey="popularidade"
            expanded={expandedSections}
            onToggle={toggleSection}
            hasValue={f.minPopularity > 0}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => set("minPopularity", n === f.minPopularity ? 0 : n)}
                  >
                    <Star
                      size={22}
                      color={n <= f.minPopularity ? "var(--fan-pink-light)" : "var(--fan-rose-mid)"}
                      fill={n <= f.minPopularity ? "var(--fan-pink-light)" : "transparent"}
                    />
                  </button>
                ))}
              </div>
              {f.minPopularity > 0 && (
                <span className="text-[11px]" style={{ color: "var(--fan-text-3)" }}>
                  ≥ {f.minPopularity * 20}/100
                </span>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            label="Tags / Gêneros"
            sectionKey="generos"
            expanded={expandedSections}
            onToggle={toggleSection}
            hasValue={f.genres.length > 0}
          >
            <TagInput
              value={f.genres}
              onChange={(tags) => set("genres", tags)}
              placeholder="Ex: Omegaverse, slow burn..."
            />
          </CollapsibleSection>
          <CollapsibleSection
            label="Status da obra"
            sectionKey="status"
            expanded={expandedSections}
            onToggle={toggleSection}
            hasValue={f.statuses.length > 0}
          >
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  active={f.statuses.includes(s)}
                  onClick={() => toggleArr("statuses", s)}
                />
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 px-5 py-4"
          style={{ background: "var(--fan-bg)", borderTop: "1px solid var(--fan-border)" }}
        >
          <button
            onClick={() => {
              onApply(f);
              onClose();
            }}
            className="fan-btn-primary w-full text-sm"
          >
            Aplicar filtros
            {activeCount > 0 && ` (${activeCount} ativo${activeCount !== 1 ? "s" : ""})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function CollapsibleSection({
  label,
  sectionKey,
  expanded,
  onToggle,
  hasValue,
  children,
}: {
  label: string;
  sectionKey: string;
  expanded: Record<string, boolean>;
  onToggle: (k: string) => void;
  hasValue: boolean;
  children: React.ReactNode;
}) {
  const isOpen = expanded[sectionKey] ?? false;
  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{ border: "1px solid var(--fan-border)" }}
    >
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: "var(--fan-bg-2)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: "var(--fan-text)" }}>
            {label}
          </span>
          {hasValue && <span className="w-2 h-2 rounded-full" style={{ background: "var(--fan-pink)" }} />}
        </div>
        {isOpen ? (
          <ChevronUp size={14} color="var(--fan-text-2)" />
        ) : (
          <ChevronDown size={14} color="var(--fan-text-2)" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3" style={{ background: "var(--fan-bg)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function TextInput({
  placeholder,
  value,
  onChange,
  icon,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center">
      {icon && <span className="absolute left-3 pointer-events-none">{icon}</span>}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2 rounded-[10px] text-[12px] outline-none"
        style={{
          paddingLeft: icon ? "2rem" : "0.75rem",
          paddingRight: value ? "2rem" : "0.75rem",
          background: "var(--fan-bg-2)",
          border: "1px solid var(--fan-border)",
          color: "var(--fan-text)",
        }}
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2">
          <X size={12} color="var(--fan-text-2)" />
        </button>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition"
      style={{
        background: active ? "var(--fan-pink)" : "var(--fan-bg-2)",
        color: active ? "#fff" : "var(--fan-text-2)",
        border: `1px solid ${active ? "var(--fan-pink)" : "var(--fan-border)"}`,
      }}
    >
      {label}
    </button>
  );
}
