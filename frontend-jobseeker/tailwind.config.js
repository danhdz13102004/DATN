/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        satoshi: ['Satoshi', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#4287f5', hover: '#2b6de0', light: '#6ea3f7', dark: '#1a56c4' },
        surface: '#f4f6fa',
        text: { DEFAULT: '#1a1d26', muted: '#5f6780', light: '#8b92a8' },
        border: { DEFAULT: '#e2e6ed', hover: '#c8cdd6' },
      },
    },
  },
  plugins: [],
};
