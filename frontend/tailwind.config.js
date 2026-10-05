/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        // Night-stadium ink for chrome and hero surfaces
        ink: {
          DEFAULT: '#0b1220',
          800: '#111a2e',
          700: '#1a2540',
          600: '#26324f',
        },
        // Pitch green is the brand / primary action colour
        pitch: {
          50: '#ecfdf3',
          100: '#d1fadf',
          200: '#a6f0c3',
          500: '#12a35f',
          600: '#0b8a4f',
          700: '#086d3f',
          900: '#053d24',
        },
        // Floodlight lime: highlights on dark surfaces only
        lime: {
          DEFAULT: '#c6f432',
          soft: '#e4fb9b',
        },
        // Leather-ball red: captain, destructive
        ball: {
          DEFAULT: '#d7263d',
          soft: '#fde8eb',
        },
        // Trophy gold: vice-captain, rank 1
        gold: {
          DEFAULT: '#f5b700',
          soft: '#fff5d6',
        },
        canvas: '#f4f6f3',
        // Back-compat aliases used by older class names
        primary: { DEFAULT: '#0b8a4f', dark: '#086d3f', light: '#12a35f' },
        secondary: '#0b1220',
        accent: { DEFAULT: '#d7263d', dark: '#b51d31' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 18, 32, 0.04), 0 4px 16px -4px rgba(11, 18, 32, 0.08)',
        'card-hover': '0 2px 4px rgba(11, 18, 32, 0.05), 0 16px 32px -12px rgba(11, 18, 32, 0.18)',
        lift: '0 24px 48px -16px rgba(11, 18, 32, 0.35)',
        glow: '0 0 0 4px rgba(198, 244, 50, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-up': 'sheetUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toastIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        pop: 'pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sheetUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pop: { '0%': { transform: 'scale(0.6)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
