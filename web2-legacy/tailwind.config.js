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
        'asli-light':     '#F6EEE8',
        'asli-primary':   '#007A7B',
        'asli-secondary': '#003F5A',
        'asli-dark':      '#11224E',
        'asli-accent':    '#669900',
        'asli-deep':      '#0A1628',
      },
      fontFamily: {
        display: ['"Fira Sans"', 'system-ui', 'sans-serif'],
        sans:    ['"Fira Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '8xl':  ['6rem',   { lineHeight: '1' }],
        '9xl':  ['8rem',   { lineHeight: '1' }],
        '10xl': ['10rem',  { lineHeight: '1' }],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in':    'fadeIn 0.8s ease-out forwards',
        'slide-up':   'slideUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards',
        'slide-left': 'slideLeft 0.7s cubic-bezier(0.22,1,0.36,1) forwards',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(28px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideLeft: { '0%': { opacity: '0', transform: 'translateX(28px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
