import type { WorkFormValues } from "./workValues";
import type { ProgressPair } from "@/lib/fanfarra/formConfig";

export const PAIR_BOX_STYLE: React.CSSProperties = {
  background: "var(--fan-bg-2)",
  border: "1px solid var(--fan-rose-mid)",
  color: "var(--fan-text)",
  borderRadius: 10,
  textAlign: "center",
};

export function ProgressPairBlock({
  pair,
  values,
  setDetail,
}: {
  pair: import("@/lib/fanfarra/formConfig").ProgressPair;
  values: WorkFormValues;
  setDetail: (k: string, v: unknown) => void;
}) {
  // Alguns tipos (ex: Música) só têm um campo de progresso "solto", sem um
  // "total" que faça sentido (não existe "total de escutas"). Nesses casos
  // `pair.totalKey` vem vazio e a gente nem desenha a segunda coluna —
  // evita a caixinha órfã e evita salvar um campo com nome vazio.
  const hasTotal = !!pair.totalKey;

  const cur = values.details[pair.currentKey];
  const tot = hasTotal ? values.details[pair.totalKey] : undefined;
  const curNum = Number(cur) || 0;
  const totStr = tot == null ? "" : String(tot);
  const totNum = totStr === "?" || totStr === "" ? null : Number(totStr);
  const validTotal = hasTotal && totNum != null && !Number.isNaN(totNum) && totNum > 0;
  const pct = validTotal
    ? Math.min(100, Math.max(0, pair.totalIsPercent ? curNum : (curNum / totNum!) * 100))
    : 0;
  const pctRounded = Math.round(pct * 10) / 10;

  return (
    <div className="space-y-2">
      <div className={hasTotal ? "grid grid-cols-2 gap-3" : ""}>
        <div>
          <label
            className="flex items-end justify-center text-center text-sm mb-1 min-h-[2.25rem] leading-tight"
            style={{ color: "var(--fan-text-2)" }}
          >
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
        {hasTotal && (
          <div>
            <label
              className="flex items-end justify-center text-center text-sm mb-1 min-h-[2.25rem] leading-tight"
              style={{ color: "var(--fan-text-2)" }}
            >
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
        )}
      </div>
      {validTotal && (
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--fan-border)" }}>
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