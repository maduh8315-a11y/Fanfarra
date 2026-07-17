import { useRef, useState } from "react";
import { Image as ImageIconLucide } from "lucide-react";
import { uploadCoverImage } from "@/lib/fanfarra/uploadImage";
import { C, btnGhost } from "./styles";

// ─── Campo de upload de capa ──────────────────────────────────────────────────
export function CoverField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadCoverImage(file, "bookcases");
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.bg,
            border: `1px solid ${C.border}`,
            flexShrink: 0,
            cursor: uploading ? "default" : "pointer",
          }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          {uploading ? (
            <span style={{ fontSize: 11 }}>⏳</span>
          ) : value ? (
            <img
              src={value}
              alt="Capa"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
           <ImageIconLucide size={20} color={C.muted} />
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            style={{
              ...btnGhost,
              flex: "none",
              padding: "8px 10px",
              fontSize: 12,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "Enviando..." : value ? "Trocar imagem" : "Escolher imagem"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#F87171",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
              }}
            >
              Remover capa
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </div>
      {error && <span style={{ color: "#F87171", fontSize: 11 }}>{error}</span>}
    </div>
  );
}