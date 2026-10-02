import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    // Docker Desktop (Windows/macOS) ei edasta failimuudatuste sündmusi, seega polling
    watch: { usePolling: true, interval: 300 },
  },
  build: { target: "es2022", chunkSizeWarningLimit: 900 },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
