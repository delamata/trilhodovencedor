import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { existsSync } from 'node:fs';

// Vitest (ao contrário do Next.js) não carrega .env.local sozinho —
// precisa ser explícito aqui, senão as variáveis do Supabase real
// nunca chegam a process.env e a suite inteira fica "skipped" mesmo
// com credenciais configuradas.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

// Config separada de propósito: testes de integração rodam em Node
// (não jsdom), contra o Supabase real, com timeout maior — e nunca são
// pegos pelo glob do vitest.config.ts (tests/unit/**), então
// `npm test` continua rápido e sem tocar em rede.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'server-only': path.resolve(import.meta.dirname, 'node_modules/server-only/empty.js'),
    },
  },
});
