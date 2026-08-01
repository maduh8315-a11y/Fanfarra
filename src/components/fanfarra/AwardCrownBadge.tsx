import { Crown } from "lucide-react";
import { useAwardWins } from "@/lib/fanfarra/awardsHistoryStore";

// Selo de "já foi vencedora" — aparece em qualquer lugar que a obra é
// mostrada (biblioteca, comunidade, indicados/finalistas do Awards etc).
// variant="corner": bolinha dourada no canto da capa (uso em cards/grids).
// variant="inline": lista de chips com prêmio + ano (uso em telas de detalhe).
export function AwardCrownBadge({
  title,
  variant = "corner",
}: {
  title: string | undefined;
  variant?: "corner" | "inline";
}) {
  const wins = useAwardWins(title);
  if (wins.length === 0) return null;

  const tooltip = wins.map((w) => `${w.emoji} ${w.categoryName} (${w.year})`).join("\n");

  if (variant === "corner") {
    return (
      <div
        className="absolute top-1 right-1 rounded-full px-1 py-1 flex items-center justify-center shadow-sm z-10"
        style={{ background: "#FFD24D" }}
        title={tooltip}
      >
        <Crown size={11} color="#1a0a12" />
        {wins.length > 1 && (
          <span className="text-[9px] font-extrabold leading-none ml-0.5" style={{ color: "#1a0a12" }}>
            {wins.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2" title={tooltip}>
      {wins.map((w, i) => (
        <span
          key={`${w.categoryId}-${w.year}-${i}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full"
          style={{ background: "var(--fan-active-chip)", border: "1px solid #FFD24D", color: "#FFD24D" }}
        >
          <Crown size={11} color="#FFD24D" />
          {w.categoryName} · {w.year}
        </span>
      ))}
    </div>
  );
}