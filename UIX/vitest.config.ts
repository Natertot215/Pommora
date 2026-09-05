import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineProject } from 'vitest/config'

export default defineProject({
  plugins: [react(), vanillaExtractPlugin()],
  ssr: { noExternal: [/^@pommora\//] },
  test: { environment: 'node' },
})
