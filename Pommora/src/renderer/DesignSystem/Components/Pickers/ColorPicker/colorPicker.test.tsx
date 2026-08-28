// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ColorPicker } from './ColorPicker'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function mount(greyscale?: boolean, selected = 'default'): HTMLButtonElement[] {
  const ref = createRef<HTMLButtonElement>()
  act(() => {
    root.render(
      <ColorPicker
        open
        selected={selected as never}
        onPick={() => {}}
        onDismiss={() => {}}
        triggerRef={ref}
        {...(greyscale === undefined ? {} : { greyscale })}
      />,
    )
  })
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-label]'))
}

describe('ColorPicker', () => {
  it('offers the full 8×8 grid by default', () => {
    const cells = mount()
    expect(cells).toHaveLength(64)
    expect(cells.some((c) => c.getAttribute('aria-label')?.startsWith('grey'))).toBe(true)
  })

  // The negative control's other half: withholding the row must actually remove it, and the
  // assertion must be able to go red — with `greyscale` left off, the count returns to 64.
  it('withholds the greyscale row when a surface paints the raw color', () => {
    const cells = mount(false)
    expect(cells).toHaveLength(56)
    expect(cells.some((c) => c.getAttribute('aria-label')?.startsWith('grey'))).toBe(false)
  })

  // Clearing is bound to clicking the ringed cell, so withholding the row a stored value lives in
  // would strand that value: visible in the table, unclearable in its own picker.
  it('still shows the greyscale row when the stored value lives there', () => {
    const cells = mount(false, 'grey-4')
    expect(cells).toHaveLength(64)
    expect(cells.filter((c) => c.className.includes('Selected'))).toHaveLength(1)
  })

  it('rings nothing when the value is uncolored', () => {
    const cells = mount()
    const ringed = cells.filter((c) => c.className.includes('Selected'))
    expect(ringed).toHaveLength(0)
  })
})
