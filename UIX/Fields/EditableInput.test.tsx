// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditableInput } from './EditableInput'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function mountStaying(
  onCommit: (next: string) => void,
  onCancel = (): void => {},
): HTMLInputElement {
  act(() =>
    root.render(
      <EditableInput
        initial="Alpha"
        className="field"
        autoFocus={false}
        onCommit={onCommit}
        onCancel={onCancel}
      />,
    ),
  )
  const input = host.querySelector('input')
  if (!input) throw new Error('no field')
  return input
}
const press = (input: HTMLInputElement, key: string): void =>
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })

describe('EditableInput in a field that stays mounted', () => {
  it('commits every edit, not only the first blur', () => {
    const onCommit = vi.fn()
    const input = mountStaying(onCommit)
    act(() => input.focus())
    act(() => input.blur())
    act(() => input.focus())
    input.value = 'Beta'
    press(input, 'Enter')
    expect(onCommit.mock.calls).toEqual([
      ['Alpha', 'blur'],
      ['Beta', 'key'],
    ])
  })

  it('an Escape commits nothing, shows the stored text, and leaves later edits saving', () => {
    const onCommit = vi.fn()
    const onCancel = vi.fn()
    const input = mountStaying(onCommit, onCancel)
    act(() => input.focus())
    input.value = 'Typed'
    press(input, 'Escape')
    expect(onCancel.mock.calls).toEqual([['key']])
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('Alpha')
    act(() => input.focus())
    input.value = 'Gamma'
    act(() => input.blur())
    expect(onCommit.mock.calls).toEqual([['Gamma', 'blur']])
  })
})

describe('EditableInput naming something', () => {
  it('a blank commit restores the name and cancels', () => {
    const onCommit = vi.fn()
    const onCancel = vi.fn()
    act(() =>
      root.render(
        <EditableInput
          initial="Gamma"
          required
          className="field"
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      ),
    )
    const input = host.querySelector('input') as HTMLInputElement
    act(() => input.focus())
    input.value = ''
    act(() => input.blur())
    expect(onCancel.mock.calls).toEqual([['blur']])
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('Gamma')
  })
})

describe('EditableInput torn down without a blur', () => {
  it('discards the typed text', () => {
    const onCommit = vi.fn()
    act(() =>
      root.render(
        <EditableInput initial="Alpha" className="field" onCommit={onCommit} onCancel={() => {}} />,
      ),
    )
    ;(host.querySelector('input') as HTMLInputElement).value = 'Typed'
    act(() => root.render(null))
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('EditableInput marking text that will not commit', () => {
  const notANumber = (text: string): boolean => text.trim() !== '' && Number.isNaN(Number(text))

  it('marks the opening text and every keystroke on the node', () => {
    act(() =>
      root.render(
        <EditableInput
          initial="x"
          className="field"
          invalid={notANumber}
          onCommit={() => {}}
          onCancel={() => {}}
        />,
      ),
    )
    const input = host.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('aria-invalid')).toBe('true')
    act(() => {
      input.value = '12'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(input.getAttribute('aria-invalid')).toBe('false')
  })

  it('Enter on marked text restores the field and cancels', () => {
    const onCommit = vi.fn()
    const onCancel = vi.fn()
    act(() =>
      root.render(
        <EditableInput
          initial="12"
          className="field"
          invalid={notANumber}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      ),
    )
    const input = host.querySelector('input') as HTMLInputElement
    input.value = 'x'
    press(input, 'Enter')
    expect(onCancel.mock.calls).toEqual([['key']])
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('12')
  })
})

describe('EditableInput with symbols', () => {
  it('sits between them, and a press on one keeps the caret without reaching the host', () => {
    const hostClick = vi.fn()
    act(() =>
      root.render(
        // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a stand-in host listening for clicks
        <div onClick={hostClick}>
          <EditableInput
            initial="30"
            className="field"
            leading="$"
            trailing="%"
            hint="/ 10"
            onCommit={() => {}}
            onCancel={() => {}}
          />
        </div>,
      ),
    )
    const run = host.querySelector('input')?.parentElement
    expect([...(run?.children ?? [])].map((el) => el.textContent || el.tagName)).toEqual([
      '$',
      'INPUT',
      '%',
      '/ 10',
    ])
    const symbol = run?.firstElementChild as HTMLElement
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    symbol.dispatchEvent(press)
    expect(press.defaultPrevented).toBe(true)
    act(() => symbol.click())
    expect(hostClick).not.toHaveBeenCalled()
  })
})
