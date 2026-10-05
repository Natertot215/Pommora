// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

const markup = vi.hoisted(() =>
  vi.fn((name: string) => (name === 'broken' ? 'BROKEN' : `<svg>${name}</svg>`)),
)
const loader = vi.hoisted(() => vi.fn(async () => ({ iconMarkup: markup })))

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

const { iconFor, iconsLoading, onIconLoad } = await import('./iconCache')

describe('iconCache', () => {
  it('tells every listener once the image is in, and answers it from then on', async () => {
    const told = vi.fn()
    const stop = onIconLoad(told)
    expect(iconFor('earth', '#0f0')).toBeNull()
    await vi.waitFor(() => expect(told).toHaveBeenCalled())
    expect(iconFor('earth', '#0f0')).toBeInstanceOf(ImageStub)
    stop()
  })

  it('settles every load it starts, whether it lands, fails to decode, or never fetches', async () => {
    iconFor('earth', '#123')
    iconFor('broken', '#123')
    loader.mockRejectedValueOnce(new Error('chunk'))
    iconFor('earth', '#456')
    expect(iconsLoading()).toBe(true)
    await vi.waitFor(() => expect(iconsLoading()).toBe(false))
  })

  it('loads one image per name and colour, however often a node asks', async () => {
    markup.mockClear()
    iconFor('earth', '#00f')
    iconFor('earth', '#00f')
    await vi.waitFor(() => expect(markup).toHaveBeenCalledTimes(1))
    iconFor('earth', '#00f')
    iconFor('earth', '#f00')
    await vi.waitFor(() => expect(markup).toHaveBeenCalledTimes(2))
  })
})
