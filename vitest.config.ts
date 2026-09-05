import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { projects: ['UIX', 'Core', './Pommora/vitest.config.ts'] },
})
