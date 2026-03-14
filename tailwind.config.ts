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
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "modal-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "modal-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "sidebar-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "auth-modal-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "auth-backdrop-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        "modal-in": "modal-in 0.22s ease-out both",
        "modal-out": "modal-out 0.2s ease-in forwards",
        "sidebar-in": "sidebar-in 0.25s ease-out forwards",
        "auth-modal-in": "auth-modal-in 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
        "auth-backdrop-in": "auth-backdrop-in 0.2s ease-out both",
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
