/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"], // Vite root is /src
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2fbff',
          100: '#e6f7ff',
          200: '#cfeefe',
          300: '#9adff6',
          400: '#64c7f0',
          500: '#349beb', // base
          600: '#2a87c9',
          700: '#206aa6',
          800: '#194f80',
          900: '#123659',
        },
        accent: {
          500: '#ffb86b',
          600: '#ff9f3f'
        }
      }
    }
  },
  plugins: [],
};