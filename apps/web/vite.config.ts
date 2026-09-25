import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockCloudflareVitePlugin } from "@varlock/cloudflare-integration";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      // resolved by workerd at runtime; node builds cannot bundle it
      external: ["cloudflare:workers"],
    },
  },
  plugins: [
    varlockCloudflareVitePlugin({
      configPath: "../../wrangler.jsonc",
      // Playwright points local D1/R2 at an isolated directory it wipes each run.
      persistState: process.env.E2E_PERSIST_DIR
        ? { path: process.env.E2E_PERSIST_DIR }
        : undefined,
      viteEnvironment: { name: "ssr" },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
});
