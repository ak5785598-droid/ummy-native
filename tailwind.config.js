/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        headline: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        background: '#fdfaff',
        foreground: '#0f001a',
        primary: {
          DEFAULT: '#b027ff',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f6eff9',
          foreground: '#150029',
        },
        accent: {
          DEFAULT: '#c252ff',
          foreground: '#ffffff',
        },
        border: '#e3dbe8',
        input: '#e3dbe8',
        ring: '#9b26b0',
      },
    },
  },
  plugins: [],
};
