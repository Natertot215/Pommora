// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { IconNode } from '@pommora/uix/Symbols'

const GLYPHS: Record<string, IconNode> = {
  earth: [['path', { d: 'M0 0' }]],
  broken: [['path', { d: 'BROKEN' }]],
}

const roster = vi.hoisted(() => vi.fn((name: string): IconNode | null => GLYPHS[name] ?? null))
const loader = vi.hoisted(() => vi.fn(async () => ({ lucideIconNodes: roster })))

vi.mock('@pommora/uix/Symbols', () => ({ loadFullIconSet: loader }))

class ImageStub {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  #src = ''
  get src(): string {
    return this.#src
  }
  set src(value: string) {
    this.#src = value
    queueMicrotask(() => (value.includes('BROKEN') ? this.onerror?.() : this.onload?.()))
  }
}
;(globalThis as { Image?: unknown }).Image = ImageStub

const { iconFor, iconsLoading, onIconLoad, svgOf } = await import('./iconCache')

describe('iconCache', () => {
  it('builds markup from a node list, dropping React keys', () => {
    const svg = svgOf([['path', { d: 'M0 0', key: 'abc' }]], '#fff')
    expect(svg).toContain('<svg')
    expect(svg).toContain('<path d="M0 0"/>')
    expect(svg).toContain('stroke="#fff"')
    expect(svg).not.toContain('key=')
  })

  it('answers null for an unknown name without throwing', async () => {
    expect(iconFor('not-an-icon', '#fff', 32)).toBeNull()
    await Promise.resolve()
    expect(iconFor('not-an-icon', '#fff', 32)).toBeNull()
  })

  it('tells every listener once the bitmap is in, and answers it from then on', async () => {
    const told = vi.fn()
    const stop = onIconLoad(told)
    expect(iconFor('earth', '#0f0', 32)).toBeNull()
    await vi.waitFor(() => expect(told).toHaveBeenCalled())
    expect(iconFor('earth', '#0f0', 32)).toBeInstanceOf(ImageStub)
    stop()
  })

  it('settles every load it starts, whether it lands, names nothing, fails to decode, or never fetches', async () => {
    iconFor('earth', '#123', 32)
    iconFor('not-an-icon', '#123', 32)
    iconFor('broken', '#123', 32)
    loader.mockRejectedValueOnce(new Error('chunk'))
    iconFor('earth', '#456', 32)
    expect(iconsLoading()).toBe(true)
    await vi.waitFor(() => expect(iconsLoading()).toBe(false))
  })

  it('loads a name, colour and size bucket once, and rounds a size up to its bucket', async () => {
    roster.mockClear()
    iconFor('earth', '#00f', 32)
    await Promise.resolve()
    iconFor('earth', '#00f', 32)
    await vi.waitFor(() => expect(roster).toHaveBeenCalledTimes(1))
    iconFor('earth', '#00f', 24)
    iconFor('earth', '#00f', 4)
    await Promise.resolve()
    expect(roster).toHaveBeenCalledTimes(2)
    iconFor('earth', '#00f', 64)
    await vi.waitFor(() => expect(roster).toHaveBeenCalledTimes(3))
  })
})
