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
      },
      colors: {
        coral: {
          DEFAULT: '#f97b5b',
          light: '#fff3f0',
          hover: '#f76040',
          50:  '#fff3f0',
          100: '#fde3db',
          200: '#fbc4b3',
          300: '#f9a07f',
          400: '#f97b5b',
          500: '#f76040',
          600: '#e84520',
        },
        mint: {
          50:  '#f0fdf8',
          100: '#c0f0de',
          200: '#a0e8ce',
          300: '#70d8b8',
        },
        surface: 'rgba(255,255,255,0.72)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'theme-gradient': 'linear-gradient(135deg, #c0f0de 0%, #cdf5c0 45%, #d8f5a8 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.07)',
        'raised': '0 8px 32px rgba(0,0,0,0.11)',
        'coral': '0 4px 16px rgba(249,123,91,0.35)',
      },
    },
  },
  plugins: [],
}