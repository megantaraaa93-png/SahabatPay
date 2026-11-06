/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E53935',
          light: '#EF5350',
          dark: '#C62828',
        },
        secondary: {
          DEFAULT: '#16865B',
          light: '#1DA06E',
          dark: '#0E6B48',
        },
        background: '#FFF5F4',
        surface: '#F4F8F5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
