import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-rubik)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#e8ecff',
          200: '#c9d1ff',
          300: '#a3afff',
          400: '#7a86f5',
          500: '#5a63e0',
          600: '#3f47b8',
          700: '#2e348a',
          800: '#20245e',
          900: '#13153a',
        },
        ink: {
          DEFAULT: '#0f1226',
          muted: '#4a4f6b',
          subtle: '#7a7f96',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f7f8fb',
          raised: '#ffffff',
        },
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(15, 18, 38, 0.12)',
        glow: '0 0 0 1px rgba(90, 99, 224, 0.2), 0 12px 40px -10px rgba(90, 99, 224, 0.35)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
        shimmer: 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
