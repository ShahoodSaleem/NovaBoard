/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./dashboard.html",
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        accent: "#3b82f6",
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
