import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// TypeFlow is a frontend-only static site: no server routes, no env vars, no paid services.
// Deployed to Vercel Hobby (free) as a static build of `dist/`.
// Test configuration lives in vitest.config.ts so this file stays type-clean.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
});
