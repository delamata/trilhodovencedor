import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // "server-only" só sabe ficar vazio (em vez de lançar erro)
      // quando o bundler resolve a condition "react-server", que o
      // Next.js entende mas o Vitest não. Aponta direto pro
      // empty.js que o próprio pacote já expõe para esse caso.
      'server-only': path.resolve(import.meta.dirname, 'node_modules/server-only/empty.js'),
    },
  },
});
