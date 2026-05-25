import { defineConfig } from 'vitest/config';

export default defineConfig({
  // נטרל את PostCSS באופן מפורש (config של ה-root monorepo מנסה לטעון tailwind).
  css: {
    postcss: { plugins: [] },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.d.ts', 'src/portal/components/**/*'],
    },
  },
});
