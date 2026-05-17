import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2563eb', dark: '#1e40af', light: '#dbeafe' },
        accent: '#f59e0b'
      },
      fontFamily: {
        heb: ['"Heebo"', '"Rubik"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
export default config;
