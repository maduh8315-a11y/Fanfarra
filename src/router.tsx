import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { SafeArea } from "capacitor-plugin-safe-area";

SafeArea.getSafeAreaInsets().then(({ insets }) => {
  const root = document.documentElement;
  root.style.setProperty("--safe-area-inset-top", `${insets.top}px`);
  root.style.setProperty("--safe-area-inset-bottom", `${insets.bottom}px`);
  root.style.setProperty("--safe-area-inset-left", `${insets.left}px`);
  root.style.setProperty("--safe-area-inset-right", `${insets.right}px`);
});

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
