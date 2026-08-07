import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";

// Config separada só pros testes de regras do Firestore (*.spec.ts).
// Ficam de fora do "npm test" normal de propósito, porque dependem do
// emulador do Firestore rodando (veja o script "test:rules").
export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    globals: true,
  },
});