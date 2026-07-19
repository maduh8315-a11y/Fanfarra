import { useEffect, useState } from "react";

/**
 * Retorna true/false conforme o navegador está online ou offline.
 * Em SSR (sem `window`), assume `true` (online) até hidratar no client.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true); // sempre true no primeiro render, tanto server quanto client — evita mismatch de hydration

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // garante o valor correto assim que o componente monta (evita mismatch de SSR)
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
