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
    expect(onCommit.mock.calls).toEqual([['Alpha'], ['Beta']])
  })

  it('an Escape commits nothing, shows the stored text, and leaves later edits saving', () => {
    const onCommit = vi.fn()
    const onCancel = vi.fn()
    const input = mountStaying(onCommit, onCancel)
    act(() => input.focus())
    input.value = 'Typed'
    press(input, 'Escape')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('Alpha')
    act(() => input.focus())
    input.value = 'Gamma'
    act(() => input.blur())
    expect(onCommit.mock.calls).toEqual([['Gamma']])
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
    expect(onCancel).toHaveBeenCalledTimes(1)
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
})
