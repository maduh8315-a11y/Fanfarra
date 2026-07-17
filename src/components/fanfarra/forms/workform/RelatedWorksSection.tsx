import { useState, useMemo } from "react";
import { Plus, X, Search } from "lucide-react";
import { useWorks } from "@/lib/fanfarra/store";
import { CATALOG } from "@/lib/fanfarra/recommendations";
import { usePublicRecommendations } from "@/lib/fanfarra/communityStore";
import { RELATION_TYPES, type RelatedWork, type RelationType } from "@/lib/fanfarra/formConfig";
import type { MediaType } from "@/lib/fanfarra/types";

export function RelatedWorksSection({
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

export function RelatedPickerSheet({
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