import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Two plain browser pages, decoupled from Electron. Each build folds every chunk, stylesheet, font,
// and image into its one page — the file an artifact publishes — so the pages build one at a time,
// the mode naming which; the second build leaves the first's output standing.
export default defineConfig(({ mode }) => {
  const page = mode === 'showcase' ? 'showcase' : 'dashboard'
  return {
    plugins: [react(), vanillaExtractPlugin(), viteSingleFile()],
    build: {
      emptyOutDir: page === 'dashboard',
      rollupOptions: { input: { [page]: resolve(__dirname, `${page}.html`) } },
    },
  }
})
