import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  output: "server",
  adapter: vercel({
    devToolbar: { enabled: false },
  }),
  // Desactiva la comprobación de Origin para evitar 403 "Cross-site POST form submissions are forbidden"
  // en Vercel/serverless (el Origin del request puede no coincidir). Para reactivar: define ORIGIN en Vercel.
  security: {
    checkOrigin: false,
  },
  vite: {
    // Acceso desde celular/tablet en la misma Wi‑Fi.
    server: {
      host: true,
      strictPort: true,
      hmr: {
        clientPort: 4321,
      },
      allowedHosts: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    // MapLibre 5.x: evita "__publicField is not defined" en el worker (target ES2022 + pre-bundle).
    optimizeDeps: {
      include: ["maplibre-gl"],
      esbuildOptions: {
        target: "es2022",
      },
    },
    build: {
      target: "es2022",
    },
  },
});
