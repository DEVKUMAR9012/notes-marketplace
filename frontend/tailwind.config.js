/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      opacity: {
        '8': '0.08',
        '15': '0.15',
      }
    },
  },
  plugins: [],
}