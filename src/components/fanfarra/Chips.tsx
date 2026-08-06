import { LayoutGrid } from "lucide-react";
import { MEDIA_TYPES, type MediaType } from "@/lib/fanfarra/types";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";

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
            className={`fan-chip gap-1.5 ${active ? "fan-chip-active" : ""}`}
          >
            {f === "Todos" ? (
              <LayoutGrid size={13} color={active ? "#fff" : "var(--fan-text-2)"} />
            ) : (
              <MediaIcon type={f} size={13} color={active ? "#fff" : undefined} />
            )}
            {f}
          </button>
        );
      })}
    </div>
  );
}