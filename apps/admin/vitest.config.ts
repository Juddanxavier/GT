import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  // The app tsconfig sets `jsx: preserve` for Next, which leaves JSX untransformed
  // and breaks any test that renders a component. Tests do not go through Next's
  // compiler, so the transform is turned on here for tests only. Vitest runs the
  // `oxc` transformer, so the option belongs there (`esbuild` is ignored).
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    },
  },
});
