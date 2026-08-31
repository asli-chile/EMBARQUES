import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,astro,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-open-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        "brand-blue": "#11224E",
        "brand-cream": "#F6EEE8",
        "brand-teal": "#007A7B",
        "brand-dark-teal": "#003F5A",
        "brand-olive": "#669900",
        "brand-gray": "#6B7280",
        "brand-red": "#B91C1C",
        /* Superficies del dashboard (tema oscuro). Ver docs/ESTILOS-VISUALES.md */
        "dash-bg": "#060B17",
        "dash-header": "#0A1328",
        "dash-surface": "#0D1830",
        "dash-surface-hover": "#12203C",
        "dash-control": "#111E38",
        "dash-control-hover": "#172748",
      },
      /* Las animaciones viven en src/styles/motion.css, no aquí: un solo lugar
         donde buscarlas. Esto solo expone los tokens como utilidades de Tailwind
         (`duration-fast`, `ease-enter`…). Ver docs/MOTION-DESIGN.md */
      transitionTimingFunction: {
        enter: "var(--motion-ease-enter)",
        exit: "var(--motion-ease-exit)",
        standard: "var(--motion-ease-standard)",
        emphasis: "var(--motion-ease-emphasis)",
      },
      transitionDuration: {
        instant: "var(--motion-duration-instant)",
        fast: "var(--motion-duration-fast)",
        base: "var(--motion-duration-base)",
        slow: "var(--motion-duration-slow)",
        slower: "var(--motion-duration-slower)",
      },
      boxShadow: {
        "mac-modal":
          "0 25px 50px -12px rgb(0 0 0 / 0.15), 0 0 0 1px rgb(0 0 0 / 0.05)",
        "modal-blur":
          "0 0 0 1px rgb(255 255 255 / 0.15), 0 0 40px rgb(255 255 255 / 0.2), 0 0 80px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
