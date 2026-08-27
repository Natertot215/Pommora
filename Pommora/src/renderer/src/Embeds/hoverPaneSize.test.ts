// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Mod = typeof import('./hoverPaneSize')

const load = vi.fn()
const save = vi.fn(async () => ({ ok: true as const, value: null }))

async function fresh(stored: unknown): Promise<Mod> {
  vi.resetModules()
  load.mockImplementation(async () => ({ ok: true, value: stored }))
  ;(window as unknown as { nexus: unknown }).nexus = { hoverCard: { load, save } }
  return await import('./hoverPaneSize')
}

beforeEach(() => {
  load.mockClear()
  save.mockClear()
})

describe('the size accessor', () => {
  it('an absent row keeps the default', async () => {
    const m = await fresh(null)
    m.seedHoverCardSize()
    await Promise.resolve()
    expect(m.hoverPaneSize()).toEqual(m.CARD_DEFAULT)
  })

  it('a stored value seeds in, clamped to the floor on read', async () => {
    const m = await fresh({ w: 40, h: 900 })
    m.seedHoverCardSize()
    await new Promise((r) => setTimeout(r))
    expect(m.hoverPaneSize()).toEqual({ w: m.CARD_MIN.w, h: 900 })
  })

  it('a set clamps, rounds, and writes through', async () => {
    const m = await fresh(null)
    m.setHoverCardSize({ w: 300.6, h: 12 })
    expect(m.hoverPaneSize()).toEqual({ w: 301, h: m.CARD_MIN.h })
    expect(save).toHaveBeenCalledWith({ w: 301, h: m.CARD_MIN.h })
  })
})
