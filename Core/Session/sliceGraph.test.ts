import { describe, expect, it, vi } from 'vitest'

// The suite enters at store.ts, so a slice that reaches back to it passes every other test and throws at boot when anything loads the slice first.
const slices = import.meta.glob('./*Slice.ts')

describe('slice import graph', () => {
  it.each(Object.keys(slices))('%s loads before the store', async (path) => {
    vi.resetModules()
    await slices[path]()
    await expect(import('./store')).resolves.toBeDefined()
  })
})
