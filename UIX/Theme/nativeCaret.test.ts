// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { caretHead, initNativeCaret, mergeRows } from './nativeCaret'

const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))

describe('caretHead', () => {
  const field = (selectionDirection: 'forward' | 'backward' | 'none') => ({
    selectionStart: 2,
    selectionEnd: 5,
    selectionDirection,
    value: 'abcdefg',
  })

  it('sits at the end a forward selection grows from', () => {
    expect(caretHead(field('forward'), 5)).toBe(5)
  })

  it('sits at the start a backward selection grows from', () => {
    expect(caretHead(field('backward'), 2)).toBe(2)
  })

  it('reads a directionless selection by the end that left the anchor', () => {
    expect(caretHead(field('none'), 5)).toBe(2)
    expect(caretHead(field('none'), 2)).toBe(5)
    expect(caretHead(field('none'), null)).toBe(5)
  })
})

describe('mergeRows', () => {
  it('merges rects on one row into one pill and keeps rows apart', () => {
    const rows = mergeRows(
      [
        new DOMRect(10, 0, 20, 16),
        new DOMRect(40, 0.5, 10, 16),
        new DOMRect(0, 16, 30, 16),
        new DOMRect(60, 0, 0, 16),
      ],
      18,
    )
    expect(rows).toEqual([
      { x: 10, y: 0, w: 40, h: 18 },
      { x: 0, y: 16, w: 30, h: 18 },
    ])
  })
})

describe('initNativeCaret', () => {
  let input: HTMLInputElement

  beforeAll(() => initNativeCaret())

  const mount = (): HTMLInputElement => {
    const row = document.createElement('div')
    const el = document.createElement('input')
    el.type = 'text'
    el.value = 'hello'
    el.style.lineHeight = '16px'
    el.getBoundingClientRect = () => new DOMRect(0, 0, 200, 20)
    row.append(el)
    document.body.append(row)
    return el
  }

  const overlay = (): HTMLElement | null => document.querySelector('.caret-overlay')

  afterEach(() => {
    input?.parentElement?.remove()
    vi.restoreAllMocks()
  })

  it('shows the drawn bar on focus and hides it on blur', async () => {
    input = mount()
    input.focus()
    await frame()
    expect(overlay()?.style.display).toBe('block')
    expect(overlay()?.style.height).toBe('16px')
    input.blur()
    expect(overlay()).toBeNull()
  })

  it('lets go of a focused field that leaves the page', async () => {
    input = mount()
    input.focus()
    await frame()
    input.parentElement?.remove()
    document.dispatchEvent(new Event('keyup'))
    await frame()
    expect(overlay()).toBeNull()
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    document.dispatchEvent(new Event('keyup'))
    expect(raf).not.toHaveBeenCalled()
  })
})
