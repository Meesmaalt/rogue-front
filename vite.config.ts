import type { IncomingMessage } from "node:http";
import { createServer, defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";

function automaticProxyMounts(target: string): Plugin {
  const mounts = new Map<string, Promise<ViteDevServer>>();
  return {
    name: "rogue-front-proxy-mounts",
    apply: "serve",
    configureServer(server) {
      if (server.config.base !== "/" || !server.httpServer) return;
      const httpServer = server.httpServer;
      const restorePrefix = (req: IncomingMessage) => {
        // Proxies may preserve the path or declare the prefix they stripped.
        const forwarded = req.headers["x-forwarded-prefix"];
        const prefix = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.trim();
        if (prefix && /^\/[a-zA-Z0-9_/-]+$/.test(prefix) && prefix !== "/") {
          const mount = prefix.replace(/\/+$/, "") + "/";
          if (!(req.url || "/").startsWith(mount)) req.url = mount.slice(0, -1) + (req.url || "/");
        }
      };
      httpServer.prependListener("upgrade", restorePrefix);
      server.middlewares.use((req, res, next) => {
        restorePrefix(req);
        const pathname = new URL(req.url || "/", "http://localhost").pathname;
        // Existing mounts handle both entry pages and their entire module/asset graph.
        let base = [...mounts.keys()].sort((a, b) => b.length - a.length).find(p => pathname.startsWith(p));
        if (!base) {
          // Native root resources belong to the parent Vite server.
          if (/^\/(?:src|node_modules|models|ui|api|ws|assets|@vite|@id|@fs)(?:\/|$)/.test(pathname) || pathname === "/") return next();
          if (pathname.endsWith("/")) base = pathname;
          else if (/\/(?:index|arsenal)\.html$/.test(pathname)) base = pathname.slice(0, pathname.lastIndexOf("/") + 1);
          else if (!pathname.split("/").pop()?.includes(".")) {
            res.writeHead(308, { Location: pathname + "/" + new URL(req.url || "/", "http://localhost").search });
            return res.end();
          }
          if (!base || base === "/") return next();
          const prefix = base;
          const rewrite = (url: string) => url.slice(prefix.length - 1);
          const mounted = createServer({
            configFile: false, root: server.config.root, mode: server.config.mode, base: prefix,
            cacheDir: `${server.config.cacheDir}/mount-${Buffer.from(prefix).toString("hex")}`,
            server: {
              middlewareMode: { server: httpServer }, allowedHosts: true,
              hmr: { server: httpServer }, watch: server.config.server.watch,
              preTransformRequests: false,
              proxy: {
                [`${prefix}api`]: { target, rewrite },
                [`${prefix}ws`]: { target, ws: true, rewrite },
              },
            },
          });
          mounts.set(prefix, mounted);
          mounted.catch(() => mounts.delete(prefix));
        }
        void mounts.get(base)!.then(mounted => mounted.middlewares(req, res, next)).catch(next);
      });
    },
    async closeBundle() {
      await Promise.allSettled([...mounts.values()].map(async mounted => (await mounted).close()));
      mounts.clear();
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "ROGUE_FRONT_");
  const path = (process.env.ROGUE_FRONT_BASE_PATH || env.ROGUE_FRONT_BASE_PATH || "/").trim();
  const base = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}/`;
  const target = process.env.ROGUE_FRONT_API_TARGET || env.ROGUE_FRONT_API_TARGET || "http://localhost:8787";
  const stripBase = (url: string) => base === "/" ? url : url.slice(base.length - 1);
  return {
    base,
    plugins: [automaticProxyMounts(target)],
    server: {
      host: true,
      // Deployment proxy owns hostname routing; accept any forwarded Host header.
      allowedHosts: true,
      port: 5173,
      // Transform on request; avoid root warmups racing the mounted module graphs.
      preTransformRequests: false,
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
