import { describe, expect, it, vi } from 'vitest'

const slices = import.meta.glob('./*Slice.ts')
const FRESH_GRAPH_MS = 30_000

describe('slice import graph', () => {
  it.each(Object.keys(slices))(
    '%s loads before the store',
    async (path) => {
      vi.resetModules()
      await slices[path]()
      await expect(import('./store')).resolves.toBeDefined()
    },
    FRESH_GRAPH_MS,
  )
})
