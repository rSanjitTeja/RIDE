/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F111A',
        surface: '#1A1D27',
        primary: '#4D5BCE',
        accent: '#00D1FF',
        border: '#2E3246',
        textMain: '#E0E6ED',
        textMuted: '#8B949E'
      }
    },
  },
  plugins: [],
}
