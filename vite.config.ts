import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 3000,
    // Removido o proxy para evitar problemas com CORS
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
