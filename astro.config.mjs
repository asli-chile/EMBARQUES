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
          "src/components/reservas/index.ts",
          "src/components/reservas/CrearReservaContent.tsx",
          "src/components/reservas/MisReservasContent.tsx",
          "src/components/reservas/PapeleraContent.tsx",
          "src/components/registros/RegistrosContent.tsx",
        ],
      },
    },
    resolve: {
      /** Una sola copia de React en cliente (evita "Invalid hook call" en LocaleProvider, etc.). */
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.resolve(__dirname, "src"),
        stream: "stream-browserify",
      },
    },
    // MapLibre 5.x: evita "__publicField is not defined" en el worker (target ES2022 + pre-bundle).
    // Incluir dependencias pesadas del itinerario evita solicitudes a deps obsoletas (504 Outdated Optimize Dep).
    // xlsx / xlsx-js-style: NO incluir en optimizeDeps — al preempaquetarlos, esbuild encadena stream-browserify
    // y Vite externaliza events/buffer/util → error en el cliente. Se cargan sin dep cache o vía chunk de build.
    // exceljs: sí incluir — evita 504 Outdated Optimize Dep al hacer import() dinámico desde Registros.
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "gsap",
        "maplibre-gl",
        "react-map-gl/maplibre",
        "jspdf",
        "jspdf-autotable",
        "date-fns",
        "date-fns/locale",
        "react-datepicker",
        "ag-grid-community",
        "ag-grid-react",
        "exceljs",
      ],
      exclude: ["xlsx", "xlsx-js-style"],
      esbuildOptions: {
        target: "es2022",
      },
    },
    build: {
      target: "es2022",
    },
  },
});
