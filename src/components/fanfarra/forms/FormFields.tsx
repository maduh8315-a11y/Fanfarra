import { useState } from "react";
import { Star, ExternalLink, Plus, X } from "lucide-react";
import type { DateParts } from "@/lib/fanfarra/types";

const INPUT_STYLE: React.CSSProperties = {
  background: "var(--fan-bg-2)",
  border: "0.5px solid var(--fan-rose-mid)",
  color: "var(--fan-text)",
};

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] mb-2" style={{ color: "var(--fan-text-2)" }}>
        {label}
        {required && (
          <span style={{ color: "#F87171", marginLeft: 4 }} aria-label="Campo obrigatório">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "url";
}) {
  return (
    <input
      type={type}
      inputMode={type === "number" ? "numeric" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[10px] px-3 py-3 text-sm outline-none"
      style={INPUT_STYLE}
    />
  );
}

export function UrlInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const open = () => {
    if (value) window.open(value, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "https://"}
        className="flex-1 rounded-[10px] px-3 py-3 text-sm outline-none"
        style={INPUT_STYLE}
      />
      <button
        type="button"
        onClick={open}
        disabled={!value}
        className="px-3 rounded-[10px] flex items-center gap-1 text-[11px] disabled:opacity-40"
        style={{
          background: "var(--fan-bg-2)",
          border: "0.5px solid var(--fan-pink)",
          color: "var(--fan-pink-light)",
        }}
      >
        <ExternalLink size={12} /> Abrir
      </button>
    </div>
  );
}

export function ToggleField({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{ background: value ? "var(--fan-pink)" : "var(--fan-border)" }}
      aria-pressed={value}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: value ? 22 : 2 }}
      />
    </button>
  );
}

export function SliderField({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="flex-1 accent-[var(--fan-pink)]"
      />
      <span className="text-[12px] w-10 text-right" style={{ color: "var(--fan-pink-light)" }}>
        {value}%
      </span>
    </div>
  );
}

export function ChipsField({
  options,
  value,
  onChange,
  multi,
}: {
  options: readonly string[];
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  const isActive = (o: string) => (multi ? Array.isArray(value) && value.includes(o) : value === o);
  const toggle = (o: string) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    } else {
      onChange(value === o ? "" : o);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`fan-chip ${isActive(o) ? "fan-chip-active" : ""}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function DatePickerTriple({
  value,
  onChange,
  disabled,
}: {
  value: DateParts | undefined;
  onChange: (v: DateParts) => void;
  disabled?: boolean;
}) {
  const v = value ?? {};
  const update = (patch: Partial<DateParts>) => onChange({ ...v, ...patch });
  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => yearNow - i);
  const selectStyle: React.CSSProperties = { ...INPUT_STYLE, opacity: disabled ? 0.4 : 1 };
  return (
    <div className="grid grid-cols-3 gap-2" aria-disabled={disabled}>
      <select
        disabled={disabled}
        value={v.d ?? ""}
        onChange={(e) => update({ d: e.target.value ? parseInt(e.target.value, 10) : undefined })}
        className="rounded-[10px] px-2 py-3 text-sm outline-none"
        style={selectStyle}
      >
        <option value="">Dia</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        disabled={disabled}
        value={v.m ?? ""}
        onChange={(e) => update({ m: e.target.value ? parseInt(e.target.value, 10) : undefined })}
        className="rounded-[10px] px-2 py-3 text-sm outline-none"
        style={selectStyle}
      >
        <option value="">Mês</option>
        {MONTHS.map((name, i) => (
          <option key={i} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        disabled={disabled}
        value={v.y ?? ""}
        onChange={(e) => update({ y: e.target.value ? parseInt(e.target.value, 10) : undefined })}
        className="rounded-[10px] px-2 py-3 text-sm outline-none"
        style={selectStyle}
      >
        <option value="">Ano</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RatingStars({
  value,
  onChange,
  size = 26,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)}>
          <Star
            size={size}
            color={n <= value ? "var(--fan-pink-light)" : "var(--fan-rose-mid)"}
            fill={n <= value ? "var(--fan-pink-light)" : "transparent"}
          />
        </button>
      ))}
    </div>
  );
}

export function TextareaField({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full rounded-[10px] px-3 py-3 text-sm outline-none resize-none"
        style={INPUT_STYLE}
      />
      {maxLength && (
        <span
          className="absolute bottom-2 right-3 text-[10px]"
          style={{ color: "var(--fan-text-2)" }}
        >
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}

// Converte h/m/s em total de minutos decimais
function hmsToMinutes(h: number, m: number, s: number): number {
  return h * 60 + m + s / 60;
}

// Formata minutos totais em "Xh Ym"
function formatMinutes(total: number): string {
  if (total <= 0) return "—";
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export interface EpisodeDuration {
  hours: number;
  minutes: number;
  seconds: number;
}

/** Campo de duração por episódio com cálculo automático de tempo total assistido */
export function EpisodeDurationField({
  duration,
  episodeCount,
  onChange,
}: {
  duration: EpisodeDuration;
  episodeCount: number;
  onChange: (d: EpisodeDuration) => void;
}) {
  const totalMinutes =
    hmsToMinutes(duration.hours, duration.minutes, duration.seconds) * (episodeCount || 0);
  const hasData =
    (duration.hours > 0 || duration.minutes > 0 || duration.seconds > 0) && episodeCount > 0;

  const numInput = (label: string, value: number, onChangeFn: (v: number) => void, max: number) => (
    <div className="flex-1">
      <label className="block text-[10px] text-center mb-1" style={{ color: "var(--fan-text-2)" }}>
        {label}
      </label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value || ""}
        placeholder="0"
        onChange={(e) => {
          const v = Math.max(0, Math.min(max, parseInt(e.target.value) || 0));
          onChangeFn(v);
        }}
        className="w-full px-2 py-3 text-sm text-center outline-none rounded-[10px]"
        style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
      />
    </div>
  );

  return (
    <div
      className="rounded-[12px] p-4 space-y-3"
      style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
    >
      <p className="text-[12px] font-bold" style={{ color: "var(--fan-text-3)" }}>
        Duração por episódio
      </p>
      <div className="flex gap-2 items-end">
        {numInput("Horas", duration.hours, (v) => onChange({ ...duration, hours: v }), 23)}
        <span className="text-lg font-bold pb-2" style={{ color: "var(--fan-rose-mid)" }}>
          :
        </span>
        {numInput("Minutos", duration.minutes, (v) => onChange({ ...duration, minutes: v }), 59)}
        <span className="text-lg font-bold pb-2" style={{ color: "var(--fan-rose-mid)" }}>
          :
        </span>
        {numInput("Segundos", duration.seconds, (v) => onChange({ ...duration, seconds: v }), 59)}
      </div>

      {/* Resultado calculado */}
      <div
        className="rounded-[10px] px-4 py-3 flex items-center justify-between"
        style={{
          background: hasData ? "rgba(255,0,102,0.08)" : "var(--fan-bg)",
          border: `0.5px solid ${hasData ? "rgba(255,0,102,0.3)" : "var(--fan-border)"}`,
        }}
      >
        <span className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
          {episodeCount > 0 ? `${episodeCount} ep × duração` : "Informe episódios acima"}
        </span>
        <span className="text-[13px] font-bold" style={{ color: hasData ? "var(--fan-pink-light)" : "var(--fan-rose-mid)" }}>
          {hasData ? formatMinutes(totalMinutes) : "—"}
        </span>
      </div>
    </div>
  );
}

/** Campo de múltiplos fandoms para Fanfic (crossovers) */
export function FandomsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const SUGGESTIONS = [
    "Naruto",
    "One Piece",
    "Attack on Titan",
    "Demon Slayer",
    "My Hero Academia",
    "Dragon Ball",
    "Bleach",
    "Fullmetal Alchemist",
    "Hunter x Hunter",
    "Death Note",
    "Sword Art Online",
    "Re:Zero",
    "Tokyo Ghoul",
    "Fairy Tail",
    "Black Clover",
    "Harry Potter",
    "Marvel",
    "DC",
    "K-pop",
    "BTS",
    "BLACKPINK",
  ];

  const filtered =
    input.length >= 1
      ? SUGGESTIONS.filter(
          (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s),
        )
      : [];

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
    setShowSuggestions(false);
  };

  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  return (
    <div className="space-y-2">
      {/* Tags adicionadas */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((f) => (
            <span
              key={f}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: "var(--fan-active-chip)", border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)" }}
            >
              {f}
              <button type="button" onClick={() => remove(f)} aria-label={`Remover ${f}`}>
                <X size={10} color="var(--fan-pink-light)" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input com autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(input);
              }
            }}
            placeholder="Ex: Naruto, Harry Potter..."
            className="flex-1 rounded-[10px] px-3 py-3 text-sm outline-none"
            style={{
              background: "var(--fan-bg-2)",
              border: "0.5px solid var(--fan-rose-mid)",
              color: "var(--fan-text)",
            }}
          />
          <button
            type="button"
            onClick={() => add(input)}
            disabled={!input.trim()}
            className="px-3 rounded-[10px] flex items-center gap-1 text-[11px] font-bold disabled:opacity-40"
            style={{ background: "var(--fan-pink)", color: "white" }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Sugestões */}
        {showSuggestions && filtered.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-[10px] overflow-hidden z-20"
            style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
          >
            {filtered.slice(0, 6).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="w-full text-left px-4 py-2.5 text-[12px]"
                style={{ color: "#F2D9E6", borderBottom: "0.5px solid var(--fan-border)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px]" style={{ color: "var(--fan-rose-mid)" }}>
        Digite e pressione Add ou Enter. Para crossovers, adicione mais de um fandom.
      </p>
    </div>
  );
}
