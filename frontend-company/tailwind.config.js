/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        satoshi: ['Satoshi', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#11d134', hover: '#0eb02b', light: '#4ae564', dark: '#0a8a22' },
        surface: '#f4f6fa',
        text: { DEFAULT: '#1a1d26', muted: '#5f6780', light: '#8b92a8' },
        border: { DEFAULT: '#e2e6ed', hover: '#c8cdd6' },
      },
    },
  },
  plugins: [],
};
