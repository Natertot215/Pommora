// @vitest-environment jsdom
// A typeable picker's second door: a right-press writes the value out instead of stepping it. It
// must land on a selected field and leave the list alone, and it must reach the trigger whether or
// not the left press would have handed the list to the OS.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PickerControl } from './PickerControl'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const OPTIONS = [
  { value: '0.5', label: '50%' },
  { value: '1', label: '100%' },
  { value: '1.5', label: '150%' },
]

let host: HTMLDivElement
let root: Root
const onCommit = vi.fn()

function mount(): void {
  act(() => {
    root.render(
      <PickerControl
        ariaLabel="Editor Scale"
        value="1"
        options={OPTIONS}
        onPick={() => {}}
        typeable={{ text: '100', suffix: '%', onCommit }}
      />,
    )
  })
}

const trigger = (): HTMLButtonElement =>
  host.querySelector('button[aria-label="Editor Scale"]') as HTMLButtonElement
const field = (): HTMLInputElement | null => host.querySelector('input')
const menuOpen = (): boolean => document.querySelectorAll('[data-picker-portal]').length > 0

function press(el: Element, type: string, init: MouseEventInit = {}): void {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }))
  })
}

beforeEach(() => {
  onCommit.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mount()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

describe('a typeable picker', () => {
  it('opens the field on a right-press, with the value selected', () => {
    press(trigger(), 'contextmenu', { button: 2 })
    const input = field()
    expect(input).not.toBeNull()
    expect(input?.value).toBe('100')
    expect(document.activeElement).toBe(input)
    expect([input?.selectionStart, input?.selectionEnd]).toEqual([0, 3])
  })

  it('keeps the unit drawn beside the field', () => {
    expect(trigger().textContent).toContain('100%')
    press(trigger(), 'contextmenu', { button: 2 })
    expect(field()?.value).toBe('100')
    expect(host.textContent).toContain('%')
  })

  it('leaves the list closed', () => {
    press(trigger(), 'contextmenu', { button: 2 })
    expect(menuOpen()).toBe(false)
  })

  it('leaves a left press stepping the value as it always did', () => {
    press(trigger(), 'click', { detail: 1 })
    expect(field()).toBeNull()
    expect(menuOpen()).toBe(true)
  })

  it('hands what was written to the caller', () => {
    press(trigger(), 'contextmenu', { button: 2 })
    const input = field() as HTMLInputElement
    act(() => {
      input.value = '125'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.blur()
    })
    expect(onCommit).toHaveBeenCalledWith('125')
  })

  // The window above a field closes on Escape unless the press is marked handled.
  it('marks an abandoning Escape handled', () => {
    press(trigger(), 'contextmenu', { button: 2 })
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    act(() => {
      ;(field() as HTMLInputElement).dispatchEvent(esc)
    })
    expect(esc.defaultPrevented).toBe(true)
    expect(field()).toBeNull()
  })
})
