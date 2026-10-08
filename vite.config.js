import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredSalesPath = process.env.SALES_DATA_PATH || env.SALES_DATA_PATH;
  const privateSalesPath = configuredSalesPath ? path.resolve(configuredSalesPath) : null;
  const privateFileProtection = privateSalesPath ? {
    name: "protect-private-sales-file",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        let pathname;
        try {
          pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        } catch {
          return next();
        }
        const candidates = [path.resolve(process.cwd(), `.${pathname}`)];
        if (pathname.startsWith("/@fs/")) candidates.push(path.resolve(pathname.slice(5)));
        if (candidates.some((candidate) => candidate.toLowerCase() === privateSalesPath.toLowerCase())) {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }
        next();
      });
    },
  } : null;
  return {
    plugins: [tailwindcss(), react(), ...(privateFileProtection ? [privateFileProtection] : [])],
    server: {
      fs: { deny: privateSalesPath ? [privateSalesPath] : [] },
      proxy: {
        "/api": "http://127.0.0.1:3000",
      },
    },
  };
});
