// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MenuDoorContext, PickerControl } from './PickerControl'
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
const door = vi.fn(async () => null)

function mount(): void {
  act(() => {
    root.render(
      <MenuDoorContext.Provider value={door}>
        <PickerControl
          ariaLabel="Editor Scale"
          value="1"
          options={OPTIONS}
          onPick={() => {}}
          typeable={{ text: '100', suffix: '%', onCommit }}
        />
      </MenuDoorContext.Provider>,
    )
  })
}

const trigger = (): HTMLButtonElement =>
  host.querySelector('button[aria-label="Editor Scale"]') as HTMLButtonElement
const field = (): HTMLInputElement | null => host.querySelector('input')

function press(el: Element, type: string, init: MouseEventInit = {}): void {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }))
  })
}

beforeEach(() => {
  onCommit.mockClear()
  door.mockClear()
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
    expect(door).not.toHaveBeenCalled()
  })

  it('a left press opens the list through the door, marked on the current value', () => {
    press(trigger(), 'click', { detail: 1 })
    expect(field()).toBeNull()
    expect(door).toHaveBeenCalledWith(
      [
        { label: '50%', action: '0.5', checked: false, icon: undefined },
        { label: '100%', action: '1', checked: true, icon: undefined },
        { label: '150%', action: '1.5', checked: false, icon: undefined },
      ],
      host.querySelector('span'),
    )
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
