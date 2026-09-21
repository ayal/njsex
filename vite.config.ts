import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Data lives in public/data (written by the pipeline's `make publish`). base './' works at any GitHub Pages path.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
