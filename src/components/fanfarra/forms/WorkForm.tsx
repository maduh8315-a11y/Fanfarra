import { useState, useRef, useMemo } from "react";
import { splitReaction } from "@/lib/fanfarra/icons";
import { uploadCoverImage } from "@/lib/fanfarra/uploadImage";
import { EPISODE_DURATION_TYPES } from "@/lib/fanfarra/formConfig";
import { useNavigate } from "@tanstack/react-router";
import { TagInput } from "@/components/fanfarra/TagInput";
import {
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  Loader2,
  Plus,
  X,
  Search,
  Star,
  AlertTriangle,
} from "lucide-react";
import {
  useBookcases,
  addWorkToShelf,
  removeWorkFromShelf,
  getShelvesForWork,
} from "@/lib/fanfarra/bookcaseStore";
import { Library } from "lucide-react";
import {
  COMPLETED_STATUSES,
  DEFAULT_STATUS_FOR_TYPE,
  TYPE_FIELDS,
  TYPE_STATUSES,
  type DateParts,
  type FieldDef,
  type MediaType,
  type Status,
  type Work,
} from "@/lib/fanfarra/types";
import {
  COMPLETED_STATUS_FOR_TYPE,
  EXTRA_NUMERIC,
  IMPORT_HINTS,
  PROGRESS_PAIRS,
  RATING_CRITERIA,
  REACTIONS,
  RELATION_TYPES,
  type RelatedWork,
  type RelationType,
  getKeysToSkip,
} from "@/lib/fanfarra/formConfig";
import { useWorks } from "@/lib/fanfarra/store";
import { importWorkFromUrl, type ImportedWorkData } from "@/lib/api/importWork.functions";
import { CATALOG } from "@/lib/fanfarra/recommendations";
import { usePublicRecommendations } from "@/lib/fanfarra/communityStore";
import {
  ChipsField,
  DatePickerTriple,
  EpisodeDurationField,
  FandomsField,
  Field,
  RatingStars,
  SliderField,
  TextInput,
  TextareaField,
  ToggleField,
  UrlInput,
  type EpisodeDuration,
} from "./FormFields";

const GENRES = [
  "Ação",
  "Aventura",
  "Comédia",
  "Drama",
  "Romance",
  "Fantasia",
  "Sci-fi",
  "Terror",
  "Mistério",
  "Slice of life",
  "Sobrenatural",
  "Psicológico",
];

const MUSIC_GENRES = [
  "Pop",
  "Rock",
  "Rap/Hip-Hop",
  "R&B",
  "Eletrônica",
  "Sertanejo",
  "Funk",
  "MPB",
  "Pagode/Samba",
  "K-pop",
  "Indie",
  "Jazz",
  "Country",
  "Metal",
];

// Traduz/mapeia gêneros vindos de APIs externas (em inglês) para as opções
// fixas do app (em português), usadas pelos chips de gênero.
const GENRE_ALIASES: Record<string, string> = {
  action: "Ação",
  adventure: "Aventura",
  comedy: "Comédia",
  drama: "Drama",
  romance: "Romance",
  fantasy: "Fantasia",
  "sci-fi": "Sci-fi",
  scifi: "Sci-fi",
  "science fiction": "Sci-fi",
  horror: "Terror",
  mystery: "Mistério",
  suspense: "Mistério",
  thriller: "Mistério",
  "slice of life": "Slice of life",
  supernatural: "Sobrenatural",
  psychological: "Psicológico",
};

function matchImportedGenres(imported: string[] | undefined, options: readonly string[]): string[] {
  if (!imported || imported.length === 0) return [];
  const result = new Set<string>();
  for (const raw of imported) {
    for (const token of raw.split(/[/,]/)) {
      const key = token.trim().toLowerCase();
      if (!key) continue;
      const alias = GENRE_ALIASES[key];
      if (alias && (options as readonly string[]).includes(alias)) {
        result.add(alias);
        continue;
      }
      const direct = options.find((o) => o.toLowerCase() === key);
      if (direct) result.add(direct);
    }
  }
  return Array.from(result);
}

// ─── Helpers para mapear plataforma / país / idioma vindos da importação ──

const PLATFORM_ALIASES: Record<string, string> = {
  ao3: "AO3",
  "archive of our own": "AO3",
  wattpad: "Wattpad",
  "spirit fanfics": "Spirit Fanfics",
  spiritfanfics: "Spirit Fanfics",
  "fanfiction.net": "Fanfiction.net",
  ffn: "Fanfiction.net",
  steam: "PC",
  pc: "PC",
};

const COUNTRY_ALIASES: Record<string, string> = {
  "south korea": "Coreia",
  korea: "Coreia",
  china: "China",
  japan: "Japão",
  thailand: "Tailândia",
};

const LANGUAGE_ALIASES: Record<string, string> = {
  english: "EN",
  en: "EN",
  português: "PT",
  portuguese: "PT",
  pt: "PT",
  español: "ES",
  spanish: "ES",
  es: "ES",
};

function matchChipValue(
  raw: string | undefined,
  options: readonly string[],
  aliases: Record<string, string>,
): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  if (aliases[key] && options.includes(aliases[key])) return aliases[key];
  return options.find((o) => o.toLowerCase() === key);
}

function matchChipValues(
  raw: string[] | undefined,
  options: readonly string[],
  aliases: Record<string, string>,
): string[] {
  if (!raw) return [];
  const result = new Set<string>();
  for (const r of raw) {
    const m = matchChipValue(r, options, aliases);
    if (m) result.add(m);
  }
  return Array.from(result);
}

function getChipField(
  type: MediaType,
  key: string,
): { options: readonly string[]; multi?: boolean } | undefined {
  return TYPE_FIELDS[type].find(
    (f): f is Extract<FieldDef, { kind: "chips" }> => f.key === key && f.kind === "chips",
  );
}

export interface WorkFormValues {
  title: string;
  status: Status;
  cover: string;
  rating: number;
  notes: string;
  startDate?: DateParts;
  endDate?: DateParts;
  genres: string[];
  details: Record<string, unknown>;
  shelfEntries: { bookcaseId: string; shelfId: string }[];
}

export function workToFormValues(
  w: Work,
  shelfEntries?: { bookcaseId: string; shelfId: string }[],
): WorkFormValues {
  return {
    title: w.title,
    status: w.status,
    cover: w.cover ?? "",
    rating: w.rating,
    notes: w.notes,
    startDate: w.startDate,
    endDate: w.endDate,
    genres: w.genres ?? [],
    details: w.details ?? {},
    shelfEntries: shelfEntries ?? [],
  };
}

export function formValuesToWork(
  type: MediaType,
  v: WorkFormValues,
): Omit<Work, "id" | "createdAt" | "updatedAt"> {
  const pair = PROGRESS_PAIRS[type]?.[0];
  const current = pair ? Number(v.details[pair.currentKey]) || 0 : 0;
  const rawTotal = pair ? v.details[pair.totalKey] : undefined;
  const total = rawTotal == null || rawTotal === "?" ? 0 : Number(rawTotal) || 0;
  return {
    title: v.title.trim(),
    type,
    status: v.status,
    current,
    total,
    rating: v.rating,
    notes: v.notes.trim(),
    cover: v.cover.trim() || undefined,
    startDate: v.startDate,
    endDate: v.endDate,
    genres: v.genres,
    link: typeof v.details.link === "string" ? (v.details.link as string) : undefined,
    details: v.details,
  };
}

function endDateLabel(type: MediaType): string {
  if (type === "Filme") return "Data que assistiu";
  if (type === "Jogo") return "Data que zerou";
  if (type === "Anime" || type === "Série" || type === "Donghua" || type === "Dorama")
    return "Data que terminou de assistir";
  if (
    type === "Manga" ||
    type === "Manhwa" ||
    type === "Manhua" ||
    type === "Webtoon" ||
    type === "Livro" ||
    type === "Light Novel" ||
    type === "HQ" ||
    type === "Fanfic"
  )
    return "Data que terminou de ler";
  return "Data de conclusão";
}

function hasAnyDatePart(d?: DateParts): boolean {
  return !!d && (d.d != null || d.m != null || d.y != null);
}

const PAIR_BOX_STYLE: React.CSSProperties = {
  background: "var(--fan-bg-2)",
  border: "1px solid var(--fan-rose-mid)",
  color: "var(--fan-text)",
  borderRadius: 10,
  textAlign: "center",
};

function ProgressPairBlock({
  pair,
  values,
  setDetail,
}: {
  pair: import("@/lib/fanfarra/formConfig").ProgressPair;
  values: WorkFormValues;
  setDetail: (k: string, v: unknown) => void;
}) {
  const cur = values.details[pair.currentKey];
  const tot = values.details[pair.totalKey];
  const curNum = Number(cur) || 0;
  const totStr = tot == null ? "" : String(tot);
  const totNum = totStr === "?" || totStr === "" ? null : Number(totStr);
  const validTotal = totNum != null && !Number.isNaN(totNum) && totNum > 0;
  const pct = validTotal
    ? Math.min(100, Math.max(0, pair.totalIsPercent ? curNum : (curNum / totNum!) * 100))
    : 0;
  const pctRounded = Math.round(pct * 10) / 10;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1 text-center" style={{ color: "var(--fan-text-2)" }}>
            {pair.currentLabel}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={cur == null ? "" : String(cur)}
            onChange={(e) =>
              setDetail(pair.currentKey, e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full px-3 py-3 text-sm outline-none"
            style={PAIR_BOX_STYLE}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-center" style={{ color: "var(--fan-text-2)" }}>
            {pair.totalLabel}
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={totStr}
            placeholder={pair.totalIsPercent ? "0-100" : "número ou ?"}
            onChange={(e) => setDetail(pair.totalKey, e.target.value)}
            className="w-full px-3 py-3 text-sm outline-none"
            style={PAIR_BOX_STYLE}
          />
        </div>
      </div>
      {validTotal && (
        <div className="space-y-1">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--fan-border)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, var(--fan-pink), var(--fan-pink-light))",
              }}
            />
          </div>
          <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            {pair.totalIsPercent
              ? `${curNum}h · ${totNum}% concluído`
              : `${curNum} de ${totNum}${pair.unit ? ` ${pair.unit}` : ""} · ${pctRounded}% ${pair.verb ?? "concluído"}`}
          </p>
        </div>
      )}
    </div>
  );
}

function RatingsBlock({
  type,
  values,
  setValues,
  setDetail,
}: {
  type: MediaType;
  values: WorkFormValues;
  setValues: React.Dispatch<React.SetStateAction<WorkFormValues>>;
  setDetail: (k: string, v: unknown) => void;
}) {
  const criteria = RATING_CRITERIA[type] ?? [];
  const criteriaRatings = (values.details.criteriaRatings as Record<string, number>) ?? {};
  const setCriterion = (k: string, v: number) =>
    setDetail("criteriaRatings", { ...criteriaRatings, [k]: v });
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
    >
      <span className="block text-sm font-bold mb-3" style={{ color: "var(--fan-text-3)" }}>
        Avaliações
      </span>
      <div>
        {criteria.map((c) => (
          <div
            key={c.key}
            className="flex items-center justify-between py-2.5"
            style={{ borderBottom: "1px solid var(--fan-border)" }}
          >
            <span className="text-sm" style={{ color: "var(--fan-text-2)" }}>
              {c.label}
            </span>
            <RatingStars
              value={criteriaRatings[c.key] ?? 0}
              onChange={(r) => setCriterion(c.key, r)}
              size={18}
            />
          </div>
        ))}
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm font-bold" style={{ color: "var(--fan-text)" }}>
            <span className="inline-flex items-center gap-1"><Star size={13} fill="currentColor" /> Geral</span>
          </span>
          <RatingStars
            value={values.rating}
            onChange={(r) => setValues((s) => ({ ...s, rating: r }))}
            size={22}
          />
        </div>
      </div>
    </div>
  );
}

function RelatedWorksSection({
  currentType,
  value,
  onChange,
}: {
  currentType: MediaType;
  value: RelatedWork[];
  onChange: (v: RelatedWork[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
            Obras relacionadas
          </h3>
          <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
            Sequências, prequelas ou spin-offs
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-bold flex items-center gap-1"
          style={{ color: "var(--fan-pink)" }}
        >
          <Plus size={12} /> Adicionar
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {value.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 shrink-0 rounded-[10px] p-2 pr-3"
              style={{
                background: "var(--fan-bg-2)",
                border: "1px solid var(--fan-border)",
                minWidth: 220,
              }}
            >
              <div
                className="rounded-[6px] overflow-hidden shrink-0"
                style={{ width: 40, height: 56, background: "var(--fan-active-chip)" }}
              >
                {r.cover && <img src={r.cover} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--fan-text)" }}>
                  {r.title}
                </p>
                <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                  {r.type} · {r.relation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remover"
                style={{ color: "#CC0022" }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {open && (
        <RelatedPickerSheet
          currentType={currentType}
          onClose={() => setOpen(false)}
          onAdd={(rw) => {
            onChange([...value, rw]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RelatedPickerSheet({
  currentType,
  onClose,
  onAdd,
}: {
  currentType: MediaType;
  onClose: () => void;
  onAdd: (r: RelatedWork) => void;
}) {
  const [tab, setTab] = useState<"library" | "recs">("library");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Omit<RelatedWork, "relation"> | null>(null);
  const [relation, setRelation] = useState<RelationType>("Sequência");
  const works = useWorks();
  const results = works.filter((w) => w.title.toLowerCase().includes(q.toLowerCase())).slice(0, 30);

  // Candidatos da aba "Recomendações": catálogo do app + recomendações públicas da comunidade
  const communityRecs = usePublicRecommendations();
  const recCandidates = useMemo(() => {
    const fromCatalog = CATALOG.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type as MediaType,
      cover: c.cover,
    }));
    const fromCommunity = communityRecs.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      cover: r.cover,
    }));
    const seen = new Set<string>();
    return [...fromCatalog, ...fromCommunity].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [communityRecs]);
  const recResults = recCandidates
    .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 30);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onPointerDown={onClose}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl p-4 space-y-3"
        style={{
          background: "var(--fan-bg)",
          border: "1px solid var(--fan-border)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold" style={{ color: "var(--fan-text)" }}>
            Obra relacionada
          </h3>
          <button onPointerDown={onClose} aria-label="Fechar" style={{ color: "var(--fan-text-2)" }}>
            {" "}
            <X size={18} />
          </button>
        </div>

        {!picked ? (
          <>
            <div className="flex gap-2">
              {(["library", "recs"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 rounded-full py-2 text-sm font-bold"
                  style={{
                    background: tab === t ? "var(--fan-active-chip)" : "transparent",
                    border: `1px solid ${tab === t ? "var(--fan-pink)" : "var(--fan-border)"}`,
                    color: tab === t ? "var(--fan-pink-light)" : "var(--fan-text-2)",
                  }}
                >
                  {t === "library" ? "Minha biblioteca" : "Recomendações"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search
                size={14}
                color="var(--fan-text-2)"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  tab === "library" ? "Buscar na biblioteca..." : "Buscar nas recomendações..."
                }
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-[10px] outline-none"
                style={{
                  background: "var(--fan-bg)",
                  border: "1px solid var(--fan-rose-mid)",
                  color: "var(--fan-text)",
                }}
              />
            </div>
            <div className="space-y-2">
              {tab === "library" ? (
                results.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: "var(--fan-text-2)" }}>
                    Nada encontrado.
                  </p>
                ) : (
                  results.map((w) => (
                    <button
                      key={w.id}
                      onClick={() =>
                        setPicked({
                          id: w.id,
                          title: w.title,
                          type: w.type,
                          cover: w.cover,
                          source: "library",
                        })
                      }
                      className="w-full flex items-center gap-3 p-2 rounded-[10px] text-left"
                      style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
                    >
                      <div
                        className="rounded-[6px] overflow-hidden shrink-0"
                        style={{ width: 36, height: 50, background: "var(--fan-active-chip)" }}
                      >
                        {w.cover && (
                          <img src={w.cover} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--fan-text)" }}
                        >
                          {w.title}
                        </p>
                        <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                          {w.type}
                        </p>
                      </div>
                    </button>
                  ))
                )
              ) : recResults.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--fan-text-2)" }}>
                  Nada encontrado.
                </p>
              ) : (
                recResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setPicked({
                        id: c.id,
                        title: c.title,
                        type: c.type,
                        cover: c.cover,
                        source: "recommendations",
                      })
                    }
                    className="w-full flex items-center gap-3 p-2 rounded-[10px] text-left"
                    style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
                  >
                    <div
                      className="rounded-[6px] overflow-hidden shrink-0"
                      style={{ width: 36, height: 50, background: "var(--fan-active-chip)" }}
                    >
                      {c.cover && (
                        <img src={c.cover} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--fan-text)" }}
                      >
                        {c.title}
                      </p>
                      <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                        {c.type}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div
              className="flex items-center gap-3 p-2 rounded-[10px]"
              style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
            >
              <div
                className="rounded-[6px] overflow-hidden shrink-0"
                style={{ width: 36, height: 50, background: "var(--fan-active-chip)" }}
              >
                {picked.cover && (
                  <img src={picked.cover} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--fan-text)" }}>
                  {picked.title}
                </p>
                <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                  {picked.type}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm mb-2" style={{ color: "var(--fan-text-2)" }}>
                Tipo de relação
              </p>
              <div className="flex flex-wrap gap-2">
                {RELATION_TYPES.map((rt) => {
                  const active = relation === rt;
                  return (
                    <button
                      key={rt}
                      onClick={() => setRelation(rt)}
                      className="rounded-full px-3 py-1.5 text-[11px]"
                      style={{
                        background: active ? "var(--fan-active-chip)" : "transparent",
                        border: `1px solid ${active ? "var(--fan-pink)" : "var(--fan-border)"}`,
                        color: active ? "var(--fan-pink-light)" : "var(--fan-text-2)",
                        fontWeight: active ? 700 : 400,
                      }}
                    >
                      {rt}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => onAdd({ ...picked, relation })}
              className="w-full rounded-full py-3 text-sm font-bold text-white"
              style={{ background: "var(--fan-pink)" }}
            >
              Confirmar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Seletor de Prateleira ───────────────────────────────────────────────────

function ShelfSelectorSection({
  value,
  onChange,
  workId,
}: {
  value: { bookcaseId: string; shelfId: string }[];
  onChange: (v: { bookcaseId: string; shelfId: string }[]) => void;
  workId?: string;
}) {
  const bookcases = useBookcases();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(value.length > 0);

  const isSelected = (bookcaseId: string, shelfId: string) =>
    value.some((e) => e.bookcaseId === bookcaseId && e.shelfId === shelfId);

  const toggle = (bookcaseId: string, shelfId: string) => {
    if (isSelected(bookcaseId, shelfId)) {
      onChange(value.filter((e) => !(e.bookcaseId === bookcaseId && e.shelfId === shelfId)));
      if (workId) removeWorkFromShelf(bookcaseId, shelfId, workId);
    } else {
      onChange([...value, { bookcaseId, shelfId }]);
      if (workId) addWorkToShelf(bookcaseId, shelfId, workId);
    }
  };

  return (
    <div
      className="rounded-[12px] p-4 space-y-3"
      style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
    >
      <button
        type="button"
        onClick={() => setSectionOpen((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Library size={14} color="var(--fan-icon-blue)" />
          <span className="text-sm font-bold" style={{ color: "var(--fan-text)" }}>
            Adicionar à prateleira
          </span>
          {value.length > 0 && (
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)" }}
            >
              {value.length}
            </span>
          )}
        </div>
        <span style={{ color: "var(--fan-text-2)", fontSize: 14 }}>{sectionOpen ? "▲" : "▼"}</span>
      </button>

      {sectionOpen && (
        bookcases.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
          Você ainda não criou nenhuma estante.{" "}
          <a href="/collections" style={{ color: "var(--fan-pink-light)", textDecoration: "underline" }}>
            Criar agora
          </a>
        </p>
      ) : (
        <div className="space-y-2">
          {bookcases.map((bc) => {
            const open = expanded === bc.id;
            const selectedCount = bc.shelves.filter((s) => isSelected(bc.id, s.id)).length;
            return (
              <div
                key={bc.id}
                className="rounded-[10px] overflow-hidden"
                style={{ border: "1px solid var(--fan-border)" }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : bc.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5"
                  style={{ background: "var(--fan-bg)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{bc.emoji}</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--fan-text)" }}>
                      {bc.name}
                    </span>
                    {selectedCount > 0 && (
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)" }}
                      >
                        {selectedCount}
                      </span>
                    )}
                  </div>
                  <span style={{ color: "var(--fan-text-2)", fontSize: 14 }}>{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div
                    className="px-3 pb-3 pt-2 space-y-2"
                    style={{ background: "var(--fan-bg)", borderTop: "1px solid var(--fan-border)" }}
                  >
                    {bc.shelves.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                        Nenhuma prateleira ainda.
                      </p>
                    ) : (
                      bc.shelves.map((shelf) => {
                        const active = isSelected(bc.id, shelf.id);
                        return (
                          <button
                            key={shelf.id}
                            type="button"
                            onClick={() => toggle(bc.id, shelf.id)}
                            className="w-full flex items-center justify-between rounded-[8px] px-3 py-2"
                            style={{
                              background: active ? "var(--fan-active-chip)" : "var(--fan-bg-2)",
                              border: `1px solid ${active ? "var(--fan-pink)" : "var(--fan-border)"}`,
                            }}
                          >
                            <div className="text-left">
                              <p
                                className="text-sm font-semibold"
                                style={{ color: active ? "var(--fan-pink-light)" : "var(--fan-text)" }}
                              >
                                {shelf.name}
                              </p>
                              {shelf.description && (
                                <p className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                                  {shelf.description}
                                </p>
                              )}
                            </div>
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                background: active ? "var(--fan-pink)" : "transparent",
                                border: `1.5px solid ${active ? "var(--fan-pink)" : "var(--fan-rose-mid)"}`,
                              }}
                            >
                              {active && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path
                                    d="M1 4l2.5 2.5L9 1"
                                    stroke="white"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
       </div>
        )
      )}
    </div>
  );
}

function ImportSection({
  type,
  onImported,
}: {
  type: MediaType;
  onImported: (data: ImportedWorkData, meta: { source?: string; url: string }) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setWarning("");
    try {
      const result = await importWorkFromUrl({ data: { url: trimmed, type } });
      if (result.ok && result.data) {
        onImported(result.data, { source: result.source, url: trimmed });
        setUrl("");
        if (result.warning) setWarning(result.warning);
      } else {
        setError(result.error ?? "Não conseguimos importar esse link.");
      }
    } catch {
      setError("Erro ao importar. Verifique o link e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="rounded-[14px] p-4 space-y-3"
        style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
      >
        <div className="flex items-center gap-2">
          <LinkIcon size={14} color="var(--fan-icon-blue)" />
          <span className="text-sm font-bold" style={{ color: "var(--fan-text)" }}>
            Importar por link
          </span>
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={IMPORT_HINTS[type]}
          className="w-full px-3 py-3 text-sm outline-none rounded-[10px]"
          style={{ background: "var(--fan-bg)", border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
        />
        <button
          type="button"
          disabled={!url.trim() || loading}
          onClick={handleImport}
          className="w-full rounded-full py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: "var(--fan-pink)" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {loading ? "Buscando..." : "Buscar informações"}
        </button>
        {error && (
          <p className="text-sm" style={{ color: "#F87171" }}>
            {error}
          </p>
        )}
        {warning && (
          <p className="text-sm" style={{ color: "#FFB020" }}>
            <span className="inline-flex items-center gap-1"><AlertTriangle size={12} /> {warning}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--fan-border)" }} />
        <span className="text-sm" style={{ color: "var(--fan-rose-mid)" }}>
          — ou preencha manualmente —
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--fan-border)" }} />
      </div>
    </div>
  );
}

function CoverField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isFile = value.startsWith("https://") && value.includes("firebasestorage");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadCoverImage(file, "works");
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-3 items-start">
        <div
          className="rounded-[10px] overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
          style={{
            width: 80,
            height: 112,
            background: "var(--fan-bg-2)",
            border: "0.5px solid var(--fan-rose-mid)",
          }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          {uploading ? (
            <span className="text-sm">⏳</span>
          ) : value ? (
            <img src={value} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={24} color="var(--fan-text-2)" />
          )}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-[8px] py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)", background: "transparent" }}
          >
            {uploading ? "Enviando..." : isFile ? "Trocar imagem" : "Escolher arquivo"}
          </button>
          <input
            type="url"
            value={isFile ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ou cole uma URL..."
            className="w-full px-3 py-2.5 rounded-[10px] text-sm outline-none"
            style={{
              background: "var(--fan-bg-2)",
              border: "0.5px solid var(--fan-rose-mid)",
              color: "var(--fan-text)",
            }}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-sm text-left"
              style={{ color: "#7A0030" }}
            >
              Remover capa
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>
      {error && (
        <span className="text-sm" style={{ color: "#F87171" }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function WorkForm({
  type,
  initial,
  submitLabel,
  onSubmit,
  onDelete,
  workId,
}: {
  type: MediaType;
  initial?: WorkFormValues;
  submitLabel: string;
  onSubmit: (v: WorkFormValues) => void;
  onDelete?: () => void;
  workId?: string;
}) {
  const nav = useNavigate();
  const [values, setValues] = useState<WorkFormValues>(
    initial ?? {
      title: "",
      status: DEFAULT_STATUS_FOR_TYPE(type),
      cover: "",
      rating: 0,
      notes: "",
      genres: [],
      details: {},
      shelfEntries: [],
    },
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [importedFlash, setImportedFlash] = useState(false);

  const [step, setStep] = useState(0);
  const STEPS = ["Informações básicas", "Status e progresso", "Categorização", "Avaliação"];
  const totalSteps = STEPS.length;

  const setDetail = (k: string, v: unknown) =>
    setValues((s) => ({ ...s, details: { ...s.details, [k]: v } }));

  const applyImportedData = (data: ImportedWorkData, importedUrl: string) => {
    setValues((s) => {
      const nextDetails: Record<string, unknown> = { ...s.details };

      const totalsByKey: Record<string, number | undefined> = {
        totalEpisodes: data.totalEpisodes,
        totalChapters: data.totalChapters,
        totalVolumes: data.totalVolumes,
        totalPages: data.totalPages,
        totalIssues: data.totalIssues,
        totalSeasons: data.totalSeasons,
        duration: data.durationMinutes,
      };
      for (const p of PROGRESS_PAIRS[type] ?? []) {
        const v = totalsByKey[p.totalKey];
        if (v != null) nextDetails[p.totalKey] = v;
      }

      // Duração por episódio (Anime, Série, Donghua, Dorama)
      if (data.episodeDurationMinutes != null && EPISODE_DURATION_TYPES.has(type)) {
        nextDetails.episodeDuration = {
          hours: Math.floor(data.episodeDurationMinutes / 60),
          minutes: data.episodeDurationMinutes % 60,
          seconds: 0,
        };
      }

      // Resumo/Prólogo
      if (data.synopsis?.trim()) nextDetails.synopsis = data.synopsis.trim();

      // Tags livres (ex: AO3, Wattpad) — mescladas com as já existentes, sem limite artificial
      if (data.tags && data.tags.length) {
        const existingTags = Array.isArray(s.details.tags) ? (s.details.tags as string[]) : [];
        nextDetails.tags = Array.from(new Set([...existingTags, ...data.tags]));
      }

      if (data.author != null) nextDetails.author = data.author;
      if (data.studio != null) nextDetails.studio = data.studio;
      if (data.publisher != null) nextDetails.publisher = data.publisher;
      if (data.isbn != null) nextDetails.isbn = data.isbn;
      if (data.artist != null) nextDetails.artist = data.artist;
      if (data.album != null) nextDetails.album = data.album;
      if (TYPE_FIELDS[type].some((f) => f.key === "link")) nextDetails.link = importedUrl;

      // País (chips) — ex: MyDramaList traz "South Korea" -> vira "Coreia"
      const countryField = getChipField(type, "country");
      if (countryField && data.country) {
        const matchedCountry = matchChipValue(data.country, countryField.options, COUNTRY_ALIASES);
        if (matchedCountry) nextDetails.country = matchedCountry;
      } else if (data.country != null) {
        nextDetails.country = data.country;
      }

      // Plataforma (chips) — ex: AO3, Wattpad, Steam -> PC, etc.
      const platformField = getChipField(type, "platform");
      if (platformField && data.platform) {
        const matchedPlatform = matchChipValue(
          data.platform,
          platformField.options,
          PLATFORM_ALIASES,
        );
        if (matchedPlatform) {
          if (platformField.multi) {
            const existing = Array.isArray(s.details.platform)
              ? (s.details.platform as string[])
              : [];
            nextDetails.platform = Array.from(new Set([...existing, matchedPlatform]));
          } else {
            nextDetails.platform = matchedPlatform;
          }
        }
      }

      // Idioma (chips, ex: Fanfic) — ex: "English" -> "EN"
      const languageField = getChipField(type, "language");
      if (languageField && data.language) {
        const matchedLangs = matchChipValues(
          data.language,
          languageField.options,
          LANGUAGE_ALIASES,
        );
        if (matchedLangs.length) {
          nextDetails.language = languageField.multi ? matchedLangs : matchedLangs[0];
        }
      }

      // Fandoms (Fanfic)
      if (data.fandoms && data.fandoms.length) {
        const existingFandoms = Array.isArray(s.details.fandoms)
          ? (s.details.fandoms as string[])
          : [];
        nextDetails.fandoms = Array.from(new Set([...existingFandoms, ...data.fandoms]));
      }

      // Quantidade de palavras (Fanfic, Light Novel, Livro)
      if (
        data.wordCount != null &&
        (EXTRA_NUMERIC[type] ?? []).some((e) => e.key === "wordCount")
      ) {
        nextDetails.wordCount = data.wordCount;
      }

      const genreOptions = type === "Música" ? MUSIC_GENRES : GENRES;
      const matched = matchImportedGenres(data.genres, genreOptions);
      const nextGenres =
        matched.length > 0 ? Array.from(new Set([...s.genres, ...matched])) : s.genres;

      const nextStartDate =
        type === "Música" && data.releaseYear && !s.startDate?.y
          ? { ...s.startDate, y: data.releaseYear }
          : s.startDate;

      return {
        ...s,
        title: data.title?.trim() ? data.title.trim() : s.title,
        cover: data.cover?.trim() ? data.cover.trim() : s.cover,
        genres: nextGenres,
        details: nextDetails,
        startDate: nextStartDate,
      };
    });
  };

  const titleMissing = values.title.trim().length === 0;
  const canSave = !titleMissing;
  const titleRef = useRef<HTMLInputElement>(null);
  const skipKeys = getKeysToSkip(type);
  const fields = TYPE_FIELDS[type].filter((f) => !skipKeys.has(f.key));
  const endDateEnabled =
    (COMPLETED_STATUSES as readonly Status[]).includes(values.status) ||
    hasAnyDatePart(values.startDate);
  const statusOptions = TYPE_STATUSES[type];
  const pairs = PROGRESS_PAIRS[type] ?? [];
  const extras = EXTRA_NUMERIC[type] ?? [];
  const reactions: string[] = Array.isArray(values.details.reactions)
    ? (values.details.reactions as string[])
    : [];
  const fandoms: string[] = Array.isArray(values.details.fandoms)
    ? (values.details.fandoms as string[])
    : [];

  const episodeDuration: EpisodeDuration = (values.details.episodeDuration as EpisodeDuration) ?? {
    hours: 0,
    minutes: 24,
    seconds: 0,
  };
  const episodeCount = Number(values.details.episode) || Number(values.details.totalEpisodes) || 0;
  const obraCompleta = !!values.details._obraCompleta;

  const toggleObraCompleta = (on: boolean) => {
    setValues((s) => {
      const nextDetails: Record<string, unknown> = { ...s.details, _obraCompleta: on };
      if (on) {
        for (const p of pairs) {
          const cur = nextDetails[p.currentKey];
          if (cur != null && cur !== "") {
            nextDetails[p.totalKey] = p.totalIsPercent ? 100 : Number(cur) || 0;
          }
        }
      }
      return {
        ...s,
        details: nextDetails,
        status: on ? COMPLETED_STATUS_FOR_TYPE(type) : s.status,
      };
    });
  };

  const toggleReaction = (label: string) => {
    const next = reactions.includes(label)
      ? reactions.filter((r) => r !== label)
      : [...reactions, label];
    setDetail("reactions", next);
  };

  return (
  <div className="px-4 space-y-5 pb-10">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
            Passo {step + 1} de {totalSteps} — {STEPS[step]}
          </span>
          <span className="text-sm" style={{ color: "var(--fan-text-3)" }}>
            {Math.round(((step + 1) / totalSteps) * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--fan-border)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${((step + 1) / totalSteps) * 100}%`, background: "var(--fan-pink)" }}
          />
        </div>
      </div>

     <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      
      {step === 0 && (
      <>
      <ImportSection
        type={type}
        onImported={(data, meta) => {
          applyImportedData(data, meta.url);
          setImportedFlash(true);
          setTimeout(() => setImportedFlash(false), 2500);
        }}
      />
      <Field label="Título da obra" required>
        <ShelfSelectorSection
          value={values.shelfEntries}
          onChange={(v) => setValues((s) => ({ ...s, shelfEntries: v }))}
          workId={workId}
        />
        <div className="relative">
          <input
            ref={titleRef}
            type="text"
            value={values.title}
            onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
            placeholder="Ex: Attack on Titan"
            className="w-full rounded-[10px] px-3 py-3 text-sm outline-none"
            style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
          />
          {importedFlash && values.title && (
            <Check
              size={14}
              color="var(--fan-icon-blue)"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            />
          )}
        </div>
        {triedSubmit && titleMissing && (
          <p className="text-sm mt-1.5" style={{ color: "#F87171" }}>
            O título é obrigatório.
          </p>
        )}
      </Field>

      <Field label="Capa">
        <CoverField value={values.cover} onChange={(v) => setValues((s) => ({ ...s, cover: v }))} />
      </Field>

      <Field label="Resumo/Prólogo">
        <TextareaField
          value={(values.details.synopsis as string) ?? ""}
          onChange={(t) => setDetail("synopsis", t)}
          placeholder="Escreva um resumo ou prólogo da obra..."
          rows={10}
        />
     </Field>
      </>
      )}
      </div>

      {step === 1 && (
      <>
      <Field label="Status">
        <ChipsField
          options={statusOptions}
          value={values.status}
          onChange={(v) => setValues((s) => ({ ...s, status: (v as Status) || s.status }))}
        />
      </Field>

      {type === "Música" ? (
        <Field label="Data de lançamento">
          <DatePickerTriple
            value={values.startDate}
            onChange={(d) => setValues((s) => ({ ...s, startDate: d }))}
          />
        </Field>
      ) : (
        <>
          <Field label="Data de início">
            <DatePickerTriple
              value={values.startDate}
              onChange={(d) => setValues((s) => ({ ...s, startDate: d }))}
            />
          </Field>

          <Field label={endDateLabel(type)}>
            <DatePickerTriple
              value={values.endDate}
              onChange={(d) => setValues((s) => ({ ...s, endDate: d }))}
              disabled={!endDateEnabled}
            />
          </Field>
        </>
      )}

      {pairs.length > 0 && type !== "Música" && (
        <div
          className="flex items-center justify-between rounded-[10px] px-3 py-2.5"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
        >
          <span className="text-sm" style={{ color: "var(--fan-text)" }}>
            Obra completa
          </span>
          <ToggleField value={obraCompleta} onChange={toggleObraCompleta} />
        </div>
      )}

      {pairs.map((p) => (
        <ProgressPairBlock key={p.currentKey} pair={p} values={values} setDetail={setDetail} />
      ))}
      {/* Duração por episódio — só para Anime, Série, Donghua, Dorama */}
      {EPISODE_DURATION_TYPES.has(type) && (
        <EpisodeDurationField
          duration={episodeDuration}
          episodeCount={episodeCount}
          onChange={(d) => setDetail("episodeDuration", d)}
        />
      )}

      {/* Múltiplos fandoms — só para Fanfic */}
      {type === "Fanfic" && (
        <Field label="Fandoms (crossover)">
          <FandomsField value={fandoms} onChange={(v) => setDetail("fandoms", v)} />
        </Field>
      )}

      {extras.map((e) => (
        <Field key={e.key} label={e.label}>
          <TextInput
            type="number"
            value={values.details[e.key] == null ? "" : String(values.details[e.key])}
            onChange={(x) => setDetail(e.key, x === "" ? "" : Number(x))}
            placeholder={e.placeholder}
          />
        </Field>
      ))}

      {fields
        .filter((f) => !(type === "Filme" && f.key === "rewatch" && values.status !== "Assistido"))
        .map((f) => {
          const v = values.details[f.key];
          switch (f.kind) {
            case "number":
              return (
                <Field key={f.key} label={f.label}>
                  <TextInput
                    type="number"
                    value={v == null ? "" : String(v)}
                    onChange={(x) => setDetail(f.key, x === "" ? "" : Number(x))}
                  />
                </Field>
              );
            case "text":
              return (
                <Field key={f.key} label={f.label}>
                  <TextInput value={(v as string) ?? ""} onChange={(x) => setDetail(f.key, x)} />
                </Field>
              );
            case "url":
              return (
                <Field key={f.key} label={f.label}>
                  <UrlInput value={(v as string) ?? ""} onChange={(x) => setDetail(f.key, x)} />
                </Field>
              );
            case "toggle":
              return (
                <Field key={f.key} label={f.label}>
                  <ToggleField value={!!v} onChange={(x) => setDetail(f.key, x)} />
                </Field>
              );
            case "slider":
              return (
                <Field key={f.key} label={f.label}>
                  <SliderField
                    min={f.min}
                    max={f.max}
                    value={Number(v) || 0}
                    onChange={(x) => setDetail(f.key, x)}
                  />
                </Field>
              );
            case "chips":
              return (
                <Field key={f.key} label={f.label}>
                  <ChipsField
                    options={f.options}
                    value={v as string}
                    onChange={(x) => setDetail(f.key, x)}
                    multi={f.multi}
                  />
                </Field>
              );
            case "date":
              return (
                <Field key={f.key} label={f.label}>
                  <DatePickerTriple
                    value={v as DateParts | undefined}
                    onChange={(d) => setDetail(f.key, d)}
                  />
                </Field>
              );
          }
        })}
      </>
      )}

      {step === 2 && (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <RelatedWorksSection
        currentType={type}
        value={(values.details.related as RelatedWork[] | undefined) ?? []}
        onChange={(next) => setDetail("related", next)}
      />

      <Field label="Gêneros">
        <ChipsField
          options={type === "Música" ? MUSIC_GENRES : GENRES}
          value={values.genres}
          onChange={(g) => setValues((s) => ({ ...s, genres: g as string[] }))}
          multi
        />
      </Field>

      <Field label="Tags">
        <TagInput
          value={(values.details.tags as string[] | undefined) ?? []}
          onChange={(tags) => setDetail("tags", tags)}
          placeholder="Ex: Omegaverse, slow burn, enemies to lovers..."
          maxTags={50}
        />
      </Field>
       </div>
      )}
      
    

      {step === 3 && (
      <>
      <RatingsBlock type={type} values={values} setValues={setValues} setDetail={setDetail} />

      <div className="space-y-2">
        <span className="text-sm font-bold" style={{ color: "var(--fan-text-3)" }}>
          Sua reação
        </span>
        <div className="flex flex-wrap gap-2">
          {REACTIONS[type].map((r) => {
            const active = reactions.includes(r);
            const { Icon, label } = splitReaction(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleReaction(r)}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-all"
                style={{
                  background: active ? "var(--fan-active-chip)" : "var(--fan-bg-2)",
                  border: `1px solid ${active ? "var(--fan-pink)" : "var(--fan-border)"}`,
                  color: active ? "var(--fan-pink-light)" : "var(--fan-text-2)",
                  fontWeight: active ? 700 : 400,
                  transform: active ? "scale(1.05)" : "scale(1)",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Notas pessoais">
        <TextareaField
          value={values.notes}
          onChange={(t) => setValues((s) => ({ ...s, notes: t }))}
          placeholder="Adicione notas, pensamentos..."
        />
      </Field>

</>
      )}

      <div className="flex gap-2 mt-2">
        {step > 0 && (
          <button
            type="button"
            onPointerDown={() => setStep((s) => Math.max(0, s - 1))}
            className="flex-1 rounded-full py-2.5 text-sm font-bold"
            style={{ border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text-3)" }}
          >
            Voltar
          </button>
        )}

        {step < totalSteps - 1 ? (
          <button
            type="button"
            onPointerDown={() => {
              if (step === 0 && titleMissing) {
                setTriedSubmit(true);
                return;
              }
              setStep((s) => Math.min(totalSteps - 1, s + 1));
            }}
            className="flex-1 fan-btn-primary text-sm"
            style={{ touchAction: "manipulation" }}
          >
            Próximo
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={() => {
              const liveTitle = (titleRef.current?.value ?? values.title).trim();
              const updatedValues =
                liveTitle !== values.title ? { ...values, title: liveTitle } : values;
              setValues(updatedValues);
              setTriedSubmit(true);
              if (liveTitle.length > 0) onSubmit(updatedValues);
            }}
            disabled={false}
            className="flex-1 fan-btn-primary text-sm disabled:opacity-40"
            style={{ touchAction: "manipulation" }}
          >
            {submitLabel}
          </button>
        )}
      </div>

      {step === totalSteps - 1 && onDelete && (
        <button
          onPointerDown={() => setConfirmDelete(true)}
          className="w-full text-sm rounded-full py-2.5 font-bold text-white"
          style={{ background: "var(--fan-red)" }}
        >
          Excluir obra
        </button>
      )}

      {confirmDelete && onDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onPointerDown={() => setConfirmDelete(false)}
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
          >
            <h3 className="text-base font-bold" style={{ color: "var(--fan-text)" }}>
              Tem certeza?
            </h3>
            <p className="text-sm mt-2" style={{ color: "var(--fan-text-2)" }}>
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onPointerDown={() => setConfirmDelete(false)}
                className="flex-1 rounded-full py-2.5 text-sm"
                style={{ border: "0.5px solid var(--fan-rose-mid)", color: "var(--fan-text-3)" }}
              >
                Cancelar
              </button>
              <button
                onPointerDown={() => {
                  onDelete();
                  nav({ to: "/library" });
                }}
                className="flex-1 rounded-full py-2.5 text-sm font-bold text-white"
                style={{ background: "var(--fan-red)" }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
