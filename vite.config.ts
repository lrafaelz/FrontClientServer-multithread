import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  worker: {
    // formato 'es' ou 'iife' para o bundle do worker
    format: "es",
    // outras opções de Rollup para worker, se precisar
    rollupOptions: {
      output: {
        entryFileNames: "workers/[name].js",
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
