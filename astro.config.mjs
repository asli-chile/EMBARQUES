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
    /*
     * Techo de duración de las funciones.
     *
     * Sin esto rige el de Vercel, que son unos pocos segundos: suficiente para
     * cualquier pantalla, no para el chequeo diario de seguimiento, que habla
     * con un proveedor externo una vez por nave. La corrida moría a mitad de
     * camino —faltaba la última nave y nunca se enviaba el reporte, que va al
     * final— y desde fuera se veía igual que un cron que no corrió.
     *
     * Con las consultas ya en paralelo la corrida tarda segundos; el margen es
     * para que un proveedor lento no vuelva a cortarla. 60 s es el máximo que
     * admite el plan Hobby, así que sirve en cualquiera de los dos.
     */
    maxDuration: 60,
  }),
  // CSRF + proxy (asli.cl/embarques vía Vercel): confía en X-Forwarded-* solo para estos hosts.
  // Sin esto, checkOrigin compara el Origin del navegador contra la URL interna del server → 403 en POST.
  security: {
    allowedDomains: [
      { hostname: "www.asli.cl", protocol: "https" },
      { hostname: "asli.cl", protocol: "https" },
      { hostname: "**.vercel.app", protocol: "https" },
    ],
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
          // Documentos: importa jszip, que es justo la dependencia que llegaba tarde.
          "src/components/documentos/index.ts",
          "src/components/documentos/MisDocumentosContent.tsx",
          "src/components/documentos/CrearProformaContent.tsx",
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
        // jszip: lo importan Documentos y Formatos. Sin pre-empaquetar, Vite lo
        // descubría al navegar hasta esa pantalla, re-optimizaba en caliente y
        // mataba la petición en vuelo: 504 Outdated Optimize Dep y el módulo sin
        // cargar. Es el mismo motivo por el que está exceljs.
        "jszip",
        "react-email",
        "@react-email/render",
        "html-react-parser",
      ],
      exclude: ["xlsx", "xlsx-js-style", "react-day-and-night-toggle", "styled-components"],
      esbuildOptions: {
        target: "es2022",
      },
    },
    ssr: {
      // Evitar empaquetar el toggle en el server: usa styled-components / DOM.
      external: ["react-day-and-night-toggle", "styled-components"],
    },
    build: {
      target: "es2022",
    },
  },
});
