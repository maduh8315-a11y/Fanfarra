import { useState } from "react";
import { Library } from "lucide-react";
import { useBookcases, addWorkToShelf, removeWorkFromShelf } from "@/lib/fanfarra/bookcaseStore";

// ─── Seletor de Prateleira ───────────────────────────────────────────────────

export function ShelfSelectorSection({
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
