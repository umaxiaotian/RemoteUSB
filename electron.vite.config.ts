import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({
  main: { build: { rollupOptions: { input: resolve('apps/desktop/src/main/index.ts') } } },
  preload: { build: { externalizeDeps: false, rollupOptions: { input: resolve('apps/desktop/src/preload/index.ts') } } },
  renderer: { root: 'apps/desktop', plugins: [react()], build: { rollupOptions: { input: resolve('apps/desktop/index.html') } } }
});
