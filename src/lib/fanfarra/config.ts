import { useSettings } from "./extras";

// Ativa atalhos de teste (botão pra ligar/desligar o PRO manualmente, sem
// precisar comprar de verdade). Serve pra você testar as telas.
// IMPORTANTE: mude para `false` antes de publicar a versão final do app —
// caso contrário, qualquer pessoa vê o botão de "ativar PRO de teste".
export const DEV_MODE = true;

// Fonte única da verdade sobre o status PRO do usuário.
// A partir de agora, SEMPRE use este hook pra checar se algo é PRO —
// nunca leia `settings.pro` direto em outro lugar do app.
export function useIsPro(): boolean {
  const settings = useSettings();
  return settings.pro;
}