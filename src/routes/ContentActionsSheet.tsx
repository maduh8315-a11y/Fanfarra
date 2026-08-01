// src/components/fanfarra/ContentActionsSheet.tsx
import { useState } from "react";
import { MoreVertical, Share2, Flag, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reportContent } from "@/lib/fanfarra/contentReports";

const REPORT_REASONS = [
  "Spam ou propaganda",
  "Conteúdo ofensivo ou discurso de ódio",
  "Nudez ou conteúdo sexual",
  "Violência ou conteúdo perturbador",
  "Informação falsa",
  "Violação de direitos autorais",
  "Outro motivo",
] as const;

export function ContentActionsSheet({
  contentType,
  contentId,
  contentTitle,
  shareUrl,
}: {
  contentType: "recommendation" | "comment" | "profile";
  contentId: string;
  contentTitle: string;
  shareUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const close = () => {
    setOpen(false);
    setStep("menu");
    setReason(null);
    setDetails("");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: contentTitle, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copiado!");
      }
      close();
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Não foi possível compartilhar.");
      }
    }
  };

  const handleSubmitReport = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await reportContent({ contentType, contentId, reason, details });
      toast.success("Denúncia enviada. Nossa equipe vai avaliar em breve.");
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a denúncia.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Mais opções"
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(13,0,8,0.7)", border: "1px solid var(--fan-border)" }}
      >
        <MoreVertical size={18} color="var(--fan-icon-blue)" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center animate-in fade-in duration-200"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl p-5 animate-in slide-in-from-bottom duration-300"
            style={{ background: "var(--fan-bg)", border: "0.5px solid var(--fan-rose-mid)" }}
          >
            <div className="flex justify-center mb-3">
              <span className="block w-8 h-1 rounded-full" style={{ background: "var(--fan-rose-mid)" }} />
            </div>

            {step === "menu" ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold" style={{ color: "var(--fan-text)" }}>
                    Opções
                  </h2>
                  <button onClick={close} aria-label="Fechar">
                    <X size={20} color="var(--fan-text-2)" />
                  </button>
                </div>

                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-3 py-3 text-left"
                  style={{ color: "var(--fan-text)" }}
                >
                  <Share2 size={19} color="var(--fan-icon-blue)" />
                  <span className="text-sm font-medium">Compartilhar</span>
                </button>

                <button
                  onClick={() => setStep("report")}
                  className="w-full flex items-center gap-3 py-3 text-left"
                  style={{ color: "var(--fan-text)" }}
                >
                  <Flag size={19} color="var(--fan-pink)" />
                  <span className="text-sm font-medium">Denunciar conteúdo</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold" style={{ color: "var(--fan-text)" }}>
                    Por que você está denunciando?
                  </h2>
                  <button onClick={close} aria-label="Fechar">
                    <X size={20} color="var(--fan-text-2)" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 mb-3">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className="text-left px-3 py-2 rounded-xl text-sm"
                      style={{
                        border: `1px solid ${reason === r ? "var(--fan-pink)" : "var(--fan-border)"}`,
                        background: reason === r ? "var(--fan-active-chip)" : "transparent",
                        color: reason === r ? "var(--fan-pink-light)" : "var(--fan-text-2)",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Detalhes adicionais (opcional)"
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl p-3 text-sm mb-4"
                  style={{ background: "var(--fan-bg-2)", border: "1px solid var(--fan-border)", color: "var(--fan-text)" }}
                />

                <button
                  onClick={handleSubmitReport}
                  disabled={!reason || sending}
                  className="w-full py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2"
                  style={{
                    background: reason ? "var(--fan-pink)" : "var(--fan-border)",
                    color: "#fff",
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending && <Loader2 size={16} className="animate-spin" />}
                  Enviar denúncia
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}