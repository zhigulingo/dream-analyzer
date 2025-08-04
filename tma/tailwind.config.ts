import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Dark-only theme
  theme: {
    extend: {
      colors: {
        // Telegram WebApp theme colors
        tg: {
          bg: 'var(--tg-theme-bg-color, #121a12)',
          'secondary-bg': 'var(--tg-theme-secondary-bg-color, #0c110c)',
          text: 'var(--tg-theme-text-color, #ffffff)',
          hint: 'var(--tg-theme-hint-color, #b1c3d5)',
          link: 'var(--tg-theme-link-color, #366832)',
          button: 'var(--tg-theme-button-color, #366832)',
          'button-text': 'var(--tg-theme-button-text-color, #ffffff)',
          destructive: 'var(--tg-theme-destructive-text-color, #ef5b5b)',
        },
        // Custom app colors
        primary: {
          50: '#f0f9f0',
          100: '#dcf2dc',
          200: '#bce5bc',
          300: '#8dd18d',
          400: '#5fb75f',
          500: '#366832', // Main green
          600: '#2d5529',
          700: '#244322',
          800: '#1e361e',
          900: '#121a12', // Dark bg
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0c110c', // Card bg
        },
        // Reward card purple
        reward: {
          500: '#5F66B7',
          600: '#4f5596',
          700: '#424675',
        },
        // Semantic colors
        success: {
          500: '#28a745',
          600: '#1e7e34',
        },
        error: {
          500: '#ef5b5b',
          600: '#dc3545',
        },
        warning: {
          500: '#ffc107',
          600: '#e0a800',
        },
        // Figma design gradients
        'user-card': {
          from: '#5461FF',
          to: '#4A58FF',
        },
        'fact-card-1': {
          from: '#5342E1',
          to: '#7A164F',
        },
        'fact-card-2': {
          from: '#BF62ED',
          to: '#701E99',
        },
        'deep-analysis': {
          from: '#BF62ED',
          to: '#701E99',
        },
        'history-card': {
          500: '#4A58FF',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        '72r': '72rem', // ~1152px - Figma container max width
      },
      aspectRatio: {
        'facts': '1146 / 702', // Figma FactsCarousel aspect ratio
        '1146/702': '1146 / 702', // Alternative syntax
      },
      borderRadius: {
        'lg': '1rem', // 16px - custom large
        'xl': '1.5rem', // 24px - custom extra large
        '2xl': '2rem', // 32px
        '3xl': '3.75rem', // 60px - for cards
        '3.75rem': '3.75rem', // 60px - Figma spec
      },
      gradients: {
        'dark-card': 'linear-gradient(145deg, #0c110c 0%, #1a1f1a 100%)',
        'button-primary': 'linear-gradient(145deg, #366832 0%, #2d5529 100%)',
        'facts-pagination': 'linear-gradient(145deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 100%)',
      },
      backdropBlur: {
        'facts': '44px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.7s cubic-bezier(0.4,2,0.6,1) forwards',
        'spin': 'spin 1s ease-in-out infinite',
        'progress': 'progress 8s cubic-bezier(0.4,0,0.2,1) forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(24px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        progress: {
          '0%': { width: '11px' },
          '100%': { width: '20px' },
        },
      },
    },
  },
} satisfies Config

export default config