import { useEffect, useState } from "react";

/**
 * <img> com fallback automático para capas/avatares vindos de link externo.
 * Alguns hosts (ibb.co, imgur, CDNs de wattpad/anilist etc.) bloqueiam a
 * imagem dependendo do cabeçalho "Referer" que o navegador manda — em
 * alguns hosts só funciona SEM referrer, em outros só COM. Por isso, se a
 * 1ª tentativa falhar, a gente tenta de novo com a política oposta antes
 * de desistir e mostrar o fallback (em vez do ícone de "imagem quebrada").
 */
export function SafeImage({
  src,
  alt,
  className,
  style,
  fallback,
  onLoad,
}: {
  src: string | undefined | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
  onLoad?: () => void;
}) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setStage(0);
  }, [src]);

  if (!src || stage === 2) return <>{fallback}</>;

  return (
    <img
      key={`${src}-${stage}`}
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      referrerPolicy={stage === 0 ? "no-referrer" : "no-referrer-when-downgrade"}
      onLoad={onLoad}
      onError={() => setStage((s) => (s === 0 ? 1 : 2))}
    />
  );
}