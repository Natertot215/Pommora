import { resolve } from 'node:path'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: { rollupOptions: { input: { index: resolve(__dirname, 'main.ts') } } },
  },
  preload: {
    build: { rollupOptions: { input: { index: resolve(__dirname, 'Bridge/preload.ts') } } },
  },
  renderer: {
    root: resolve(__dirname, 'Renderer'),
    plugins: [react(), vanillaExtractPlugin()],
    build: { rollupOptions: { input: resolve(__dirname, 'Renderer/index.html') } },
    server: { fs: { strict: false } },
  },
})
