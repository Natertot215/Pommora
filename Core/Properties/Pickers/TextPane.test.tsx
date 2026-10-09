// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { exitWait } from '@pommora/uix/Animations/motion'
import { stubEditorBridge } from '../../Testing/editorHarness'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import type { ConnPage } from '../../Connections/pageIndex'
import type { PropertyValue } from '../propertyValue'
import { TextPane } from './TextPane'

if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const ALPHA = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
stubEditorBridge({
  'editor:menu': async () => ({ ok: true, value: null }),
  'page:open': async () => ({
    ok: true,
    value: { ...ALPHA, frontmatter: {}, body: '## Setup\n' },
  }),
})

const onCommit = vi.fn()
let host: HTMLDivElement
let root: Root
let reopen: () => void = () => {}

// The seat as the surfaces hold it: mounted across closes, its writer retired in its own passive cleanup.
function Seat({
  current,
  holder,
}: {
  current: PropertyValue | null
  holder?: ConnPage
}): React.JSX.Element {
  const [open, setOpen] = useState(true)
  reopen = () => setOpen(true)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const live = useRef(true)
  useEffect(
    () => () => {
      live.current = false
    },
    [],
  )
  return (
    <span ref={triggerRef}>
      <TextPane
        current={current}
        holder={holder}
        open={open}
        triggerRef={triggerRef}
        onCommit={(v) => live.current && onCommit(v)}
        onDismiss={() => setOpen(false)}
      />
    </span>
  )
}

const text = (value: string): PropertyValue => ({ kind: 'text', value })
const render = (current: PropertyValue | null, holder?: ConnPage): void =>
  act(() => root.render(<Seat current={current} holder={holder} />))

beforeEach(() => {
  onCommit.mockClear()
  useSession.setState({ tree: makeTree() })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  for (const n of document.querySelectorAll('[data-picker-portal]')) n.remove()
})

const pane = (): HTMLElement | null => document.querySelector('.text-pane')
function view(): EditorView {
  const dom = document.querySelector('.text-pane .cm-content')
  const v = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!v) throw new Error('the pane holds no editor')
  return v
}
const doc = (): string => view().state.doc.toString()
// Whether the editor claimed the key, which is what keeps the browser from acting on it.
const press = (key: string, shiftKey = false): boolean => {
  const e = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })
  act(() => {
    view().contentDOM.dispatchEvent(e)
  })
  return e.defaultPrevented
}
const typeAtEnd = (insert: string): void =>
  act(() => {
    const v = view()
    v.dispatch({
      changes: { from: v.state.doc.length, insert },
      selection: { anchor: v.state.doc.length + insert.length },
      userEvent: 'input.type',
    })
  })
const exited = (): Promise<void> =>
  act(() => new Promise<void>((r) => setTimeout(r, exitWait('menu') + 20)))

describe('TextPane', () => {
  it('Enter saves and closes; Shift-Enter writes a line break; Tab stays in the editor and inserts nothing', async () => {
    render(text('x'))
    expect(view().state.selection.main.head).toBe(1)
    expect(document.activeElement).toBe(view().contentDOM)
    press('Enter', true)
    expect(doc()).toBe('x\n')
    expect(view().state.selection.main.head).toBe(2)
    typeAtEnd('a')
    act(() => view().focus())
    expect(press('Tab')).toBe(true)
    expect(press('Tab', true)).toBe(true)
    expect(doc()).toBe('x\na')
    expect(document.activeElement).toBe(view().contentDOM)
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('x\na'))
    await exited()
    expect(pane()).toBeNull()
    expect(onCommit).toHaveBeenCalledOnce()
  })

  it('Escape commits the typed text once, then closes; a second close commits nothing', async () => {
    render(text('x'))
    typeAtEnd('y')
    press('Escape')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('xy'))
    await exited()
    expect(pane()).toBeNull()
    act(() => reopen())
    expect(doc()).toBe('x')
    press('Escape')
    await exited()
    expect(onCommit).toHaveBeenCalledOnce()
  })

  it('the × commits and closes; an unchanged document commits nothing; a blanked document commits null', async () => {
    const close = (): void =>
      act(() =>
        (document.querySelector('.text-pane [aria-label="Save and close"]') as HTMLElement).click(),
      )
    render(text('x'))
    typeAtEnd('y')
    close()
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('xy'))
    await exited()
    expect(pane()).toBeNull()

    act(() => reopen())
    close()
    await exited()
    expect(onCommit).toHaveBeenCalledOnce()

    act(() => reopen())
    act(() => view().dispatch({ changes: { from: 0, to: view().state.doc.length, insert: '  ' } }))
    close()
    expect(onCommit).toHaveBeenLastCalledWith(null)
  })

  it('unmounting the pane while its seat unmounts still lands the typed text (the layout cleanup runs before the seat’s passive one)', () => {
    render(text('x'))
    typeAtEnd('y')
    act(() => root.render(null))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('xy'))
  })

  it('an outside change replaces a clean pane’s text and leaves a dirty pane’s text alone', () => {
    render(text('x'))
    render(text('from elsewhere'))
    expect(doc()).toBe('from elsewhere')
    typeAtEnd('!')
    render(text('again'))
    expect(doc()).toBe('from elsewhere!')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('a right-click inside the body leaves the event un-prevented for the editor’s menu, and one on the pane’s chrome stays cancelled', () => {
    render(text('x'))
    const rightClick = (el: Element): boolean => {
      const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      act(() => {
        el.dispatchEvent(e)
      })
      return e.defaultPrevented
    }
    expect(rightClick(view().contentDOM)).toBe(false)
    expect(rightClick(pane()!)).toBe(true)
  })

  it.each([
    'Enter',
    'Tab',
  ])('%s with the `[[` pane open picks its row, and the pane stays', async (key) => {
    render(text('[[Alp]]'))
    vi.spyOn(view(), 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => view().dispatch({ selection: { anchor: 4 } }))
    expect(document.querySelector('.mdpm-ac')).not.toBeNull()
    press(key)
    expect(doc()).toBe('[[Alpha]]')
    expect(pane()).not.toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('a typed `[` pairs, and Backspace takes the pair together', () => {
    render(null)
    act(() => {
      const v = view()
      for (const handle of v.state.facet(EditorView.inputHandler))
        if (handle(v, 0, 0, '[', () => v.state.update({ changes: { from: 0, insert: '[' } }))) break
    })
    expect(doc()).toBe('[]')
    press('Backspace')
    expect(doc()).toBe('')
  })

  it('a blank pane over an empty value commits nothing', async () => {
    render(null)
    typeAtEnd('   ')
    press('Escape')
    await exited()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('offers the holding page’s headings for a bare `#`, never a `#` line of the value', async () => {
    render(text('# Foo\n[[#]]'), ALPHA)
    vi.spyOn(view(), 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => view().dispatch({ selection: { anchor: 9 } }))
    await act(() => new Promise<void>((r) => setTimeout(r, 50)))
    const rows = document.querySelector('.mdpm-ac')?.textContent ?? ''
    expect(rows).toContain('Setup')
    expect(rows).not.toContain('Foo')
  })

  it('under Automatic, a typed § lists the holding page’s headings as a page does', async () => {
    useSession.setState({
      tree: makeTree({ personalization: { inPageHeadingResolution: 'automatic' } }),
    })
    render(text('see '), ALPHA)
    vi.spyOn(view(), 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    typeAtEnd('§')
    await act(() => new Promise<void>((r) => setTimeout(r, 50)))
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })
})
