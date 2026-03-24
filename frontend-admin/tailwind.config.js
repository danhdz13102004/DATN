/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#6366f1', hover: '#4f46e5', dark: '#4338ca', light: '#818cf8' },
        surface: '#0f1117',
        text: { DEFAULT: '#1a1d26', muted: '#5f6780', light: '#8b92a8' },
        border: { DEFAULT: '#e2e6ed', hover: '#c8cdd6' },
      },
    },
  },
  plugins: [],
};
