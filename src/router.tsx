import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// As variáveis --safe-area-inset-* já são injetadas automaticamente pelo
// plugin nativo SystemBars do @capacitor/core (configurado em
// capacitor.config.ts com insetsHandling: "css"). O código antigo aqui
// sobrescrevia esse valor correto com o do pacote capacitor-plugin-safe-area,
// que ficava desatualizado no Android mais novo e resultava em 0px —
// fazendo a navbar do app ficar embaixo da barra do sistema.

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 30_000, // 30s — reaproveita o que já foi pré-carregado
  });

  return router;
};
