/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
  colors: {
    primary: { DEFAULT: '#19a633', hover: '#0eb02b', light: '#4ae564', dark: '#0a8a22' },
    'primary-dark': '#0a8a22',
        surface: '#f4f6fa',
        background: '#f8fafc',
        card: '#ffffff',
        border: { DEFAULT: '#e2e6ed', hover: '#c8cdd6', light: '#f3f4f6' },
        text: { DEFAULT: '#1a1d26', muted: '#5f6780', light: '#8b92a8', secondary: '#6b7280' },
        // Status colors
        success: { DEFAULT: '#10b981', light: '#d1fae5', dark: '#065f46' },
        warning: { DEFAULT: '#f59e0b', light: '#fef3c7', dark: '#92400e' },
        danger: { DEFAULT: '#ef4444', light: '#fee2e2', dark: '#991b1b' },
        info: { DEFAULT: '#3b82f6', light: '#dbeafe', dark: '#1e40af' },
        // Extended palette
        emerald: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
          500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
        },
        sky: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
          500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e'
        },
        amber: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f'
        },
        rose: {
          50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
          500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337'
        },
        violet: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
          500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95'
        },
        indigo: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
          500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81'
        },
        slate: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
          500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a'
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'card-lg': '0 10px 30px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05)',
        'card-lifted': '0 16px 48px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.06)',
        'button': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'button-primary': '0 2px 8px rgba(17, 209, 52, 0.25)',
        'button-primary-hover': '0 4px 12px rgba(17, 209, 52, 0.35)',
        'input': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
        'dropdown': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'dropdown-lg': '0 8px 30px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'card': '14px',
        'button': '10px',
        'badge': '8px',
        'input': '10px',
        'avatar': '12px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fadeSlideUp': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeSlideDown': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeSlideLeft': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fadeSlideRight': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scaleIn': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'skeleton-loading': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'statusPulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.3)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'fadeSlideUp': 'fadeSlideUp 0.45s ease both',
        'fadeSlideDown': 'fadeSlideDown 0.45s ease both',
        'fadeSlideLeft': 'fadeSlideLeft 0.45s ease both',
        'fadeSlideRight': 'fadeSlideRight 0.45s ease both',
        'scaleIn': 'scaleIn 0.35s ease both',
        'skeleton-loading': 'skeleton-loading 1.8s ease-in-out infinite',
        'statusPulse': 'statusPulse 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 2s linear infinite',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
