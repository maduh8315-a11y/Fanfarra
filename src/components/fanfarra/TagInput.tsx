import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { getAllTags, saveTag } from "@/lib/fanfarra/tagStore";

/**
 * TagInput — campo de tags estilo Wattpad/AO3
 *
 * Props:
 *   value      → tags já selecionadas
 *   onChange   → chamado com a nova lista ao adicionar/remover
 *   placeholder → texto do input (opcional)
 *   maxTags    → limite de tags (opcional)
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Adicionar tag...",
  maxTags,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function updateSuggestions(text: string) {
    if (!text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const all = getAllTags();
    const filtered = all.filter(
      (t: string) => t.toLowerCase().includes(text.toLowerCase()) && !value.includes(t),
    );
    setSuggestions(filtered.slice(0, 8));
    setShowSuggestions(filtered.length > 0);
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    if (maxTags && value.length >= maxTags) return;

    // Salva globalmente e adiciona à obra
    saveTag(trimmed);
    onChange([...value, trimmed]);
    setInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  const atLimit = !!maxTags && value.length >= maxTags;

  return (
    <div ref={containerRef} className="relative">
      {/* Tags selecionadas + input */}
      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-[12px] min-h-[44px] cursor-text"
        style={{
          background: "var(--fan-bg-2)",
          border: "1px solid var(--fan-border)",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: "var(--fan-active-chip)", color: "var(--fan-pink-light)", border: "1px solid var(--fan-pink)" }}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="opacity-70 hover:opacity-100"
              aria-label={`Remover tag ${tag}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {!atLimit && (
          <div className="flex flex-1 items-center gap-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                updateSuggestions(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => updateSuggestions(input)}
              placeholder={value.length === 0 ? placeholder : ""}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{
                color: "var(--fan-text)",
                caretColor: "var(--fan-pink-light)",
              }}
            />
            {input.trim() && (
              <button
                type="button"
                onClick={() => addTag(input)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{ background: "var(--fan-pink)", color: "#fff" }}
              >
                <Plus size={10} />
                Adicionar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dropdown de sugestões */}
      {showSuggestions && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-[12px] overflow-hidden z-30"
          style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)" }}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2"
              style={{ color: "var(--fan-text)", borderBottom: "1px solid var(--fan-border)" }}
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--fan-active-chip)", border: "1px solid var(--fan-pink)" }}
              >
                <Plus size={8} color="var(--fan-icon-blue)" />
              </span>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      <p className="mt-1.5 text-sm" style={{ color: "var(--fan-text-3)" }}>
        {atLimit
          ? `Limite de ${maxTags} tags atingido`
          : "Pressione Enter ou vírgula para adicionar · Backspace para remover"}
      </p>
    </div>
  );
}
