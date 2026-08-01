import { Crown } from "lucide-react";
import { useAwardWins } from "@/lib/fanfarra/awardsHistoryStore";

// Selo de "já foi vencedora" — aparece em qualquer lugar que a obra é
// mostrada (biblioteca, comunidade, indicados/finalistas do Awards etc).
// variant="corner": bolinha dourada no canto da capa (uso em cards/grids).
// variant="inline": lista de chips com prêmio + ano (uso em telas de detalhe).
// size (só pro "corner"): "md" é o padrão (cards grandes tipo grid/biblioteca),
// "sm" é pra thumbnails pequenas, tipo a linha de votação do Awards.
export function AwardCrownBadge({
  title,
  variant = "corner",
  size = "md",
}: {
  title: string | undefined;
  variant?: "corner" | "inline";
  size?: "md" | "sm";
}) {
  const wins = useAwardWins(title);
  if (wins.length === 0) return null;

  const tooltip = wins.map((w) => `${w.emoji} ${w.categoryName} (${w.year})`).join("\n");

  if (variant === "corner") {
    const isSm = size === "sm";
    return (
      <div
        className={`absolute ${isSm ? "top-0.5 right-0.5 px-0.5 py-0.5" : "top-2 right-2 px-1.5 py-1.5"} rounded-full flex items-center justify-center shadow-sm z-10`}
        style={{ background: "#FFD24D" }}
        title={tooltip}
      >
        <Crown size={isSm ? 8 : 15} color="#1a0a12" />
        {wins.length > 1 && (
          <span
            className={`${isSm ? "text-[8px]" : "text-[11px]"} font-extrabold leading-none ml-0.5`}
            style={{ color: "#1a0a12" }}
          >
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