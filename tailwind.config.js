/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
      },
      colors: {
        gold: {
          300: '#F3E5AB',
          400: '#E6C25B',
          500: '#D4AF37',
          600: '#AA8C2C',
        },
        dark: {
          900: '#121212',
          800: '#1E1E1E',
          700: '#2D2D2D',
        }
      }
    },
  },
  plugins: [],
}