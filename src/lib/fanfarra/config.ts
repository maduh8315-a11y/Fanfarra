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

// Fonte única da verdade para o(s) UID(s) de administrador do app.
// Usado para liberar o painel admin de Awards, apagar comentários/reações
// de qualquer usuário, etc.
//
// ATENÇÃO: o firestore.rules NÃO consegue importar isso (regras do Firestore
// rodam isoladas, sem acesso a código JS/TS). Se você mudar este valor,
// também precisa atualizar manualmente o firestore.rules (7 ocorrências)
// e reimplantar as regras no Console do Firebase / firebase deploy.
export const ADMIN_UIDS = ["ikvASYa9kgQknCrZeiiupirGGef1"];