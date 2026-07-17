import { useState } from "react";
import { LinkIcon, Loader2, Search, AlertTriangle } from "lucide-react";
import { IMPORT_HINTS } from "@/lib/fanfarra/formConfig";
import { importWorkFromUrl, type ImportedWorkData } from "@/lib/api/importWork.functions";
import type { MediaType } from "@/lib/fanfarra/types";

export function ImportSection({
  type,
  onImported,
}: {
  type: MediaType;
  onImported: (data: ImportedWorkData, meta: { source?: string; url: string }) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setWarning("");
    try {
      const result = await importWorkFromUrl({ data: { url: trimmed, type } });
      if (result.ok && result.data) {
        onImported(result.data, { source: result.source, url: trimmed });
        setUrl("");
        if (result.warning) setWarning(result.warning);
      } else {
        setError(result.error ?? "Não conseguimos importar esse link.");
      }
    } catch {
      setError("Erro ao importar. Verifique o link e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="rounded-[14px] p-4 space-y-3"
        style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-rose-mid)" }}
      >
        <div className="flex items-center gap-2">
          <LinkIcon size={14} color="var(--fan-icon-blue)" />
          <span className="text-sm font-bold" style={{ color: "var(--fan-text)" }}>
            Importar por link
          </span>
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={IMPORT_HINTS[type]}
          className="w-full px-3 py-3 text-sm outline-none rounded-[10px]"
          style={{ background: "var(--fan-bg)", border: "1px solid var(--fan-rose-mid)", color: "var(--fan-text)" }}
        />
        <button
          type="button"
          disabled={!url.trim() || loading}
          onClick={handleImport}
          className="w-full rounded-full py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: "var(--fan-pink)" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {loading ? "Buscando..." : "Buscar informações"}
        </button>
        {error && (
          <p className="text-sm" style={{ color: "#F87171" }}>
            {error}
          </p>
        )}
        {warning && (
          <p className="text-sm" style={{ color: "#FFB020" }}>
            <span className="inline-flex items-center gap-1"><AlertTriangle size={12} /> {warning}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--fan-border)" }} />
        <span className="text-sm" style={{ color: "var(--fan-rose-mid)" }}>
          — ou preencha manualmente —
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--fan-border)" }} />
      </div>
    </div>
  );
}
