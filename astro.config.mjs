import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  /** Producción detrás de asli.cl/embarques — enlaces y assets bajo /embarques */
  base: "/embarques",
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
      /** Precalienta islas pesadas para reducir carreras del optimizador (504 Outdated Optimize Dep). */
      warmup: {
        clientFiles: [
          "src/components/inicio/InicioContent.tsx",
          "src/components/ui/AnimatedNetworkBackground.tsx",
          "src/components/itinerario/ItinerarioContent.tsx",
          "src/components/itinerario/ItinerarioMap.tsx",
          "src/lib/itinerario-pdf.ts",
        ],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        stream: "stream-browserify",
      },
    },
    // MapLibre 5.x: evita "__publicField is not defined" en el worker (target ES2022 + pre-bundle).
    // Incluir dependencias pesadas del itinerario evita solicitudes a deps obsoletas (504 Outdated Optimize Dep).
    optimizeDeps: {
      include: [
        "gsap",
        "maplibre-gl",
        "react-map-gl/maplibre",
        "jspdf",
        "jspdf-autotable",
        "date-fns",
      ],
      esbuildOptions: {
        target: "es2022",
      },
    },
    build: {
      target: "es2022",
    },
  },
});
