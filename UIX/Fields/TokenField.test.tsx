// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TokenField } from './TokenField'
import type { RunEntry } from './FieldRun'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

const caret = (): HTMLInputElement => host.querySelector('input') as HTMLInputElement

const render = (
  props: Partial<React.ComponentProps<typeof TokenField>> & { draft?: string } = {},
): { onDraftChange: ReturnType<typeof vi.fn>; onEnter: ReturnType<typeof vi.fn> } => {
  const onDraftChange = vi.fn()
  const onEnter = vi.fn()
  act(() =>
    root.render(
      <TokenField
        entries={[]}
        draft=""
        onDraftChange={onDraftChange}
        onEnter={onEnter}
        placeholder="Value"
        {...props}
      />,
    ),
  )
  return { onDraftChange, onEnter }
}

const press = (key: string): void =>
  act(() => {
    caret().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })

const mousedown = (el: Element): boolean => {
  const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  act(() => {
    el.dispatchEvent(e)
  })
  return e.defaultPrevented
}

const entry = (key: string, onRemove = vi.fn()): RunEntry => ({ key, label: key, onRemove })

describe('TokenField', () => {
  it('reports the draft as typed', () => {
    const { onDraftChange } = render()
    // React reads the value off its own tracker, so a bare assignment looks like no change at all.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setValue?.call(caret(), 'Docs')
      caret().dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onDraftChange).toHaveBeenCalledWith('Docs')
  })

  it('Enter offers the trimmed draft, and nothing when it is blank', () => {
    const { onEnter } = render({ draft: '  Docs ' })
    press('Enter')
    expect(onEnter).toHaveBeenCalledWith('Docs')
    const blank = render({ draft: '   ' })
    press('Enter')
    expect(blank.onEnter).not.toHaveBeenCalled()
  })

  it('Backspace on an empty caret removes the last entry; on a draft it only edits', () => {
    const first = vi.fn()
    const last = vi.fn()
    render({ entries: [entry('a', first), entry('b', last)] })
    press('Backspace')
    expect(last).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
    last.mockClear()
    render({ entries: [entry('a', first), entry('b', last)], draft: 'x' })
    press('Backspace')
    expect(last).not.toHaveBeenCalled()
  })

  it('a press past the caret focuses it, and a press on a ×, focused or not, leaves focus where it is', () => {
    render({ entries: [entry('a')] })
    const remove = host.querySelector('button') as HTMLElement
    expect(mousedown(remove)).toBe(true)
    expect(document.activeElement).not.toBe(caret())
    expect(mousedown(host.firstElementChild as HTMLElement)).toBe(true)
    expect(document.activeElement).toBe(caret())
    expect(mousedown(remove)).toBe(true)
    expect(document.activeElement).toBe(caret())
    expect(mousedown(caret())).toBe(false)
  })

  it("reports a press anywhere on the field but a chip's × as a press", () => {
    const onPress = vi.fn()
    render({ entries: [entry('a')], onPress })
    mousedown(host.firstElementChild as HTMLElement)
    mousedown(caret())
    mousedown(host.querySelector('button') as HTMLElement)
    expect(onPress).toHaveBeenCalledTimes(2)
  })

  it('leaves a key the host handler prevented alone', () => {
    const { onEnter } = render({ draft: 'Docs', onKeyDown: (e) => e.preventDefault() })
    press('Enter')
    expect(onEnter).not.toHaveBeenCalled()
  })

  it('shows the placeholder only while there are no entries', () => {
    render()
    expect(caret().getAttribute('placeholder')).toBe('Value')
    render({ entries: [entry('a')] })
    expect(caret().hasAttribute('placeholder')).toBe(false)
  })
})
