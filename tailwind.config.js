/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Enterprise dark palette
        surface: {
          50:  'hsl(220, 16%, 96%)',
          100: 'hsl(220, 14%, 90%)',
          200: 'hsl(220, 13%, 78%)',
          700: 'hsl(220, 12%, 22%)',
          800: 'hsl(222, 14%, 16%)',
          850: 'hsl(222, 16%, 12%)',
          900: 'hsl(224, 18%, 9%)',
          950: 'hsl(226, 20%, 6%)',
        },
        // Accent — vibrant indigo
        accent: {
          300: 'hsl(238, 90%, 75%)',
          400: 'hsl(238, 85%, 65%)',
          500: 'hsl(238, 80%, 58%)',
          600: 'hsl(238, 75%, 50%)',
        },
        // Status colours
        ok:      'hsl(142, 70%, 45%)',
        warning: 'hsl(38, 92%, 50%)',
        error:   'hsl(0, 72%, 51%)',
        pending: 'hsl(220, 10%, 50%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
