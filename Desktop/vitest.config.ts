import { defineProject } from 'vitest/config'

export default defineProject({
  ssr: { noExternal: [/^@pommora\//] },
  test: { environment: 'node', setupFiles: ['../Core/vitest.setup.ts'] },
})
