/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'asli-light': '#F6EEE8',
        'asli-primary': '#007A7B',
        'asli-secondary': '#003F5A',
        'asli-dark': '#11224E',
        'asli-accent': '#669900',
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
        'asli-low': '0 4px 14px rgba(17, 34, 78, 0.06)',
        'asli-med': '0 12px 32px rgba(17, 34, 78, 0.1)',
        'asli-high': '0 24px 56px rgba(17, 34, 78, 0.14)',
      },
      transitionTimingFunction: {
        asli: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
