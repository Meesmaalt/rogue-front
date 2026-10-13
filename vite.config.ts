import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "ROGUE_FRONT_");
  const path = (process.env.ROGUE_FRONT_BASE_PATH || env.ROGUE_FRONT_BASE_PATH || "/").trim();
  const base = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}/`;
  const target = process.env.ROGUE_FRONT_API_TARGET || env.ROGUE_FRONT_API_TARGET || "http://localhost:8787";
  const stripBase = (url: string) => base === "/" ? url : url.slice(base.length - 1);
  return {
    base,
    server: {
      host: true,
      // Deployment proxy owns hostname routing; accept any forwarded Host header.
      allowedHosts: true,
      port: 5173,
      // Docker Desktop (Windows/macOS) ei edasta failimuudatuste sündmusi, seega polling
      watch: { usePolling: true, interval: 300 },
      proxy: {
        [`${base}api`]: { target, rewrite: stripBase },
        [`${base}ws`]: { target, ws: true, rewrite: stripBase },
      },
    },
    preview: { host: true, allowedHosts: true },
    build: { rollupOptions: {input: {main:"index.html", arsenal:"arsenal.html"},output:{manualChunks:{three:["three"]}}}, target: "es2022", chunkSizeWarningLimit: 900 },
    test: { maxWorkers: 1, minWorkers: 1, environment: "node", include: ["src/**/*.test.ts"] },
  };
});
