import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-open-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        "brand-blue": "#0f2942",
      },
      keyframes: {
        "modal-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "backdrop-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "modal-in": "modal-in 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "backdrop-in": "backdrop-in 0.25s ease-out forwards",
      },
      boxShadow: {
        "mac-modal":
          "0 25px 50px -12px rgb(0 0 0 / 0.15), 0 0 0 1px rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
