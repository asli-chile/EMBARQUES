/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Página / texto / superficies — reaccionan a html.dark */
        'asli-light': 'rgb(var(--asli-bg-rgb) / <alpha-value>)',
        'asli-surface': 'rgb(var(--asli-surface-rgb) / <alpha-value>)',
        'asli-dark': 'rgb(var(--asli-fg-rgb) / <alpha-value>)',
        /* Franjas institucionales (footer / heroes) — siempre oscuras */
        'asli-ink': 'rgb(var(--asli-ink-rgb) / <alpha-value>)',
        'asli-primary': 'rgb(var(--asli-primary-rgb) / <alpha-value>)',
        'asli-secondary': 'rgb(var(--asli-secondary-rgb) / <alpha-value>)',
        'asli-accent': 'rgb(var(--asli-accent-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      maxWidth: {
        asli: '76rem',
      },
      borderRadius: {
        asli: '14px',
        'asli-lg': '22px',
      },
      boxShadow: {
        'asli-low': 'var(--shadow-low)',
        'asli-med': 'var(--shadow-med)',
        'asli-high': 'var(--shadow-high)',
      },
      transitionTimingFunction: {
        asli: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
