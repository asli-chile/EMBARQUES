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
        /* Hex vía CSS vars del .dash-neon[data-theme] (dashboard-neon.css) */
        dash: {
          bg: "var(--dash-bg)",
          header: "var(--dash-header)",
          surface: "var(--dash-surface)",
          "surface-hover": "var(--dash-surface-hover)",
          control: "var(--dash-control)",
          "control-hover": "var(--dash-control-hover)",
          fg: "var(--dash-fg)",
          muted: "var(--dash-muted)",
          neon: "var(--dash-neon)",
          "neon-hot": "var(--dash-neon-hot)",
        },
      },
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
