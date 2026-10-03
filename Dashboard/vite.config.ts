import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

// A plain browser page, decoupled from Electron.
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
})
