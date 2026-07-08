import { MEDIA_TYPES, type MediaType } from "@/lib/fanfarra/types";

export type TypeFilter = MediaType | "Todos";
export const ALL_FILTERS: TypeFilter[] = ["Todos", ...MEDIA_TYPES];

export function TypeChips({
  value,
  onChange,
}: {
  value: TypeFilter;
  onChange: (v: TypeFilter) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none"
      style={{ scrollbarWidth: "none" }}
    >
      {ALL_FILTERS.map((f) => {
        const active = f === value;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`fan-chip ${active ? "fan-chip-active" : ""}`}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}
