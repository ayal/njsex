import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Data lives in public/data (written by the pipeline's `make publish`). base './' works at any GitHub Pages path.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
