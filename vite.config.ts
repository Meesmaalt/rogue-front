import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    // Docker Desktop (Windows/macOS) ei edasta failimuudatuste sündmusi, seega polling
    watch: { usePolling: true, interval: 300 },
    proxy: {
      "/api": process.env.ROGUE_FRONT_API_TARGET || "http://localhost:8787",
      "/ws": { target: process.env.ROGUE_FRONT_API_TARGET || "ws://localhost:8787", ws: true },
    },
  },
  build: { rollupOptions: {input: {main:"index.html", arsenal:"arsenal.html"},output:{manualChunks:{three:["three"]}}}, target: "es2022", chunkSizeWarningLimit: 900 },
  test: { maxWorkers: 1, minWorkers: 1, environment: "node", include: ["src/**/*.test.ts"] },
});
