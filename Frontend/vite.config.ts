import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const GATEWAY_DEV_URL = 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // WHY: mirrors the Nginx /api proxy so the browser stays on one origin and the gateway needs no CORS.
    proxy: { '/api': { target: GATEWAY_DEV_URL } },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
