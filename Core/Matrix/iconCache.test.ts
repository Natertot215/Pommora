// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { IconNode } from '@pommora/uix/Symbols'

const roster = vi.hoisted(() =>
  vi.fn((name: string): IconNode | null => (name === 'earth' ? [['path', { d: 'M0 0' }]] : null)),
)

vi.mock('@pommora/uix/Symbols', () => ({
  loadFullIconSet: async () => ({ lucideIconNodes: roster }),
}))

class ImageStub {
  onload: (() => void) | null = null
  #src = ''
  get src(): string {
    return this.#src
  }
  set src(value: string) {
    this.#src = value
    queueMicrotask(() => this.onload?.())
  }
}
;(globalThis as { Image?: unknown }).Image = ImageStub

const { iconFor, onIconLoad, svgOf } = await import('./iconCache')

describe('iconCache', () => {
  it('builds markup from a node list, dropping React keys', () => {
    const svg = svgOf([['path', { d: 'M0 0', key: 'abc' }]], '#fff')
    expect(svg).toContain('<svg')
    expect(svg).toContain('<path d="M0 0"/>')
    expect(svg).toContain('stroke="#fff"')
    expect(svg).not.toContain('key=')
  })

  it('answers null for an unknown name without throwing', async () => {
    expect(iconFor('not-an-icon', '#fff', 2)).toBeNull()
    await Promise.resolve()
    expect(iconFor('not-an-icon', '#fff', 2)).toBeNull()
  })

  it('tells every listener once the bitmap is in, and answers it from then on', async () => {
    const told = vi.fn()
    const stop = onIconLoad(told)
    expect(iconFor('earth', '#0f0', 2)).toBeNull()
    await vi.waitFor(() => expect(told).toHaveBeenCalled())
    expect(iconFor('earth', '#0f0', 2)).toBeInstanceOf(ImageStub)
    stop()
  })

  it('loads a name, colour and ratio once', async () => {
    roster.mockClear()
    iconFor('earth', '#00f', 2)
    await Promise.resolve()
    iconFor('earth', '#00f', 2)
    await vi.waitFor(() => expect(roster).toHaveBeenCalledTimes(1))
    iconFor('earth', '#00f', 3)
    await vi.waitFor(() => expect(roster).toHaveBeenCalledTimes(2))
  })
})
