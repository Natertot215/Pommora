import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

// A plain browser page, decoupled from Electron. Vercel's commit reaches the page through the env
// prefix, so the ledger names the commit it was deployed from.
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  envPrefix: ['VITE_', 'VERCEL_GIT_'],
})
