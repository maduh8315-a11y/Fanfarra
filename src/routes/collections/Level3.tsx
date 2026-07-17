import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Shelf } from "@/lib/fanfarra/bookcaseStore";
import type { Work } from "@/lib/fanfarra/types";
import { InnerHeader } from "./InnerHeader";
import { statusStyle } from "./helpers";
import { C, cardBase, badge, iconBtn, menuStyle, menuItem } from "./styles";

// ─── Nível 3 ──────────────────────────────────────────────────────────────────
export function Level3({
  shelf,
  works,
  fadeStyle,
  onBack,
  onNavigateToWork,
}: {
  shelf: Shelf;
  works: Work[];
  fadeStyle: CSSProperties;
  onBack: () => void;
  onNavigateToWork: (id: string) => void;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useWindowVirtualizer({
    count: works.length,
    estimateSize: () => 92,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  return (
    <>
      <InnerHeader title={shelf.name} onBack={onBack} />
      <div
        ref={listRef}
        style={{
          padding: 16,
          position: "relative",
          height: rowVirtualizer.getTotalSize(),
          ...fadeStyle,
        }}
      >
        {works.length === 0 && (
          <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>
            Nenhuma obra nesta prateleira.
          </div>
        )}
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const w = works[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 16,
                right: 16,
                paddingBottom: 12,
                transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
              }}
            >
              <div
                style={{
                  ...cardBase,
                  padding: 12,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* capa placeholder */}
                <div
                  style={{
                    width: 40,
                    height: 56,
                    borderRadius: 6,
                    background: w.cover ?? C.border,
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                  onClick={() => onNavigateToWork(w.id)}
                />
                <div
                  style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  onClick={() => onNavigateToWork(w.id)}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {w.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ ...badge, background: C.border, color: C.lilac }}>{w.type}</span>
                    <span style={{ ...badge, ...statusStyle(w.status) }}>{w.status}</span>
                  </div>
                </div>
                {/* menu ⋯ */}
                <button
                  onClick={() => setMenuId(menuId === w.id ? null : w.id)}
                  style={{ ...iconBtn, fontSize: 18 }}
                  aria-label="Opções"
                >
                  ⋯
                </button>
                {menuId === w.id && (
                  <div style={{ ...menuStyle, top: 40 }}>
                    <button
                      style={menuItem}
                      onClick={() => {
                        onNavigateToWork(w.id);
                        setMenuId(null);
                      }}
                    >
                      Ver detalhes
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}