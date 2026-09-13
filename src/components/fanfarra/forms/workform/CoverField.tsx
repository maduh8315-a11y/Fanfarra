import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadCoverImage } from "@/lib/fanfarra/uploadImage";
import { SafeImage } from "@/components/fanfarra/SafeImage";

export function CoverField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isFile = value.startsWith("https://") && value.includes("firebasestorage");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadCoverImage(file, "works");
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-3 items-start">
        <div
          className="rounded-[10px] overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
          style={{
            width: 80,
            height: 112,
            background: "var(--fan-bg-2)",
            border: "0.5px solid var(--fan-rose-mid)",
          }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" color="var(--fan-pink-light)" />
          ) : (
            <SafeImage
              src={value}
              alt="Capa"
              className="w-full h-full object-cover"
              fallback={
                <div className="flex flex-col items-center gap-1 px-1 text-center">
                  <ImageIcon size={20} color="var(--fan-text-2)" />
                  {value && (
                    <span className="text-[10px] leading-tight" style={{ color: "var(--fan-text-2)" }}>
                      Não carregou
                    </span>
                  )}
                </div>
              }
            />
          )}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-[8px] py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ border: "1px solid var(--fan-pink)", color: "var(--fan-pink-light)", background: "transparent" }}
          >
            {uploading ? "Enviando..." : isFile ? "Trocar imagem" : "Escolher arquivo"}
          </button>
          <input
            type="url"
            value={isFile ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ou cole uma URL..."
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-[10px] text-sm outline-none"
            style={{
              background: "var(--fan-bg-2)",
              border: "0.5px solid var(--fan-rose-mid)",
              color: "var(--fan-text)",
            }}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-sm text-left"
              style={{ color: "#7A0030" }}
            >
              Remover capa
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>
      {error && (
        <span className="text-sm" style={{ color: "#F87171" }}>
          {error}
        </span>
      )}
    </div>
  );
}