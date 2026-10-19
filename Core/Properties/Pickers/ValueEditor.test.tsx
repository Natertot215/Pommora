// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { invalidInput } from '@pommora/uix/Fields/fields.css'
import { buildPageIndex } from '../../Connections/pageIndex'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { stubEditorBridge, testHost } from '../../Testing/editorHarness'
import type { Remembers } from '../../MarkdownPM/Links/linkSettle'
import { ValueEditor } from './ValueEditor'

stubEditorBridge()

const conn: ConnectionsApi = {
  index: buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  headingsOf: () => undefined,
  open: () => {},
}
const host = { ...testHost(), connections: () => conn }
const onCommit = vi.fn()
const onClose = vi.fn()
let container: HTMLDivElement
let root: Root

beforeEach(() => {
  onCommit.mockClear()
  onClose.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  for (const n of document.querySelectorAll('[data-picker-portal]')) n.remove()
})

const mount = (
  initial: string,
  props: Partial<Parameters<typeof ValueEditor>[0]> = {},
): EditorView => {
  act(() =>
    root.render(
      <ValueEditor
        initial={initial}
        holder={undefined}
        host={host}
        oneLine
        onCommit={onCommit}
        onClose={onClose}
        {...props}
      />,
    ),
  )
  const dom = container.querySelector('.cm-editor')
  const view = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!view) throw new Error('no editor')
  return view
}
const doc = (view: EditorView): string => view.state.doc.toString()
const press = (view: EditorView, key: string, mods: Partial<KeyboardEventInit> = {}): boolean => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods })
  act(() => {
    view.contentDOM.dispatchEvent(e)
  })
  return e.defaultPrevented
}
const type = (view: EditorView, insert: string, userEvent = 'input.type'): void =>
  act(() => {
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length },
      userEvent,
    })
  })
const blur = (view: EditorView, relatedTarget: Element | null = null): void =>
  act(() => {
    view.contentDOM.dispatchEvent(new FocusEvent('blur', { relatedTarget }))
  })

describe('ValueEditor in its one-line mode', () => {
  it('opens focused with the caret at the end, on a surface that neither wraps nor spellchecks', () => {
    const view = mount('[[Alpha]]')
    expect(document.activeElement).toBe(view.contentDOM)
    expect(view.state.selection.main.head).toBe(9)
    expect(view.contentDOM.getAttribute('spellcheck')).toBe('false')
    expect(view.contentDOM.classList.contains('cm-lineWrapping')).toBe(false)
    expect(container.querySelector('.value-field.mdpm-shell')).not.toBeNull()
  })

  it('with no connections, a one-line link is no link to seat, and the caret rests at the end', () => {
    const view = mount('[[Notes]]', { host: testHost() })
    expect(view.state.selection.main.head).toBe(9)
  })

  it('Return commits a changed value once and closes; on an unchanged value it closes alone', () => {
    const view = mount('[[Alpha]]')
    type(view, ' x')
    press(view, 'Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('[[Alpha]] x')
    expect(onClose).toHaveBeenCalledOnce()
    act(() => root.unmount())
    expect(onCommit).toHaveBeenCalledOnce()

    root = createRoot(container)
    onCommit.mockClear()
    onClose.mockClear()
    mount('[[Alpha]]')
    press(view, 'Enter')
    expect(onCommit).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Return in a shown slot rests past the link first, and the next Return commits', () => {
    const view = mount('[[Alpha|al]]')
    act(() => view.dispatch({ selection: { anchor: 10 } }))
    type(view, 'x')
    press(view, 'Enter')
    expect(view.state.selection.main.head).toBe(13)
    expect(onCommit).not.toHaveBeenCalled()
    press(view, 'Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('[[Alpha|alx]]')
  })

  it('Shift-Enter and Mod-Enter insert nothing', () => {
    const view = mount('a')
    expect(press(view, 'Enter', { shiftKey: true })).toBe(true)
    // Mod reads as Ctrl off a Mac, which jsdom is.
    expect(press(view, 'Enter', { ctrlKey: true })).toBe(true)
    expect(doc(view)).toBe('a')
    expect(onCommit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Tab is not the field’s, so the focus it moves commits through the blur; the pane keeps it', () => {
    const view = mount('a')
    type(view, 'b')
    expect(press(view, 'Tab')).toBe(false)
    blur(view)
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('ab')
    act(() => root.unmount())
    root = createRoot(container)
    const pane = mount('a', { oneLine: false })
    expect(press(pane, 'Tab')).toBe(true)
    expect(press(pane, 'Tab', { shiftKey: true })).toBe(true)
  })

  it('a pasted or typed break lands as a space', () => {
    const view = mount('a')
    type(view, 'b\nc\nd', 'input.paste')
    expect(doc(view)).toBe('ab c d')
    expect(view.state.doc.lines).toBe(1)
  })

  it('Escape cancels without a commit, and the unmount saves nothing after it', () => {
    const view = mount('a')
    type(view, 'b')
    press(view, 'Escape')
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
    act(() => root.unmount())
    root = createRoot(container)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('`[[` opens the picker, and Escape with it open closes the picker rather than the field', async () => {
    const view = mount('')
    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => {
      view.dispatch({
        changes: { from: 0, insert: '[[Al' },
        selection: { anchor: 4 },
        userEvent: 'input.type',
      })
    })
    expect(document.querySelector('.mdpm-ac')).not.toBeNull()
    expect(press(view, 'Escape')).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
    press(view, 'Escape')
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('blur commits a changed value and closes; a blur into the caret pane does neither', () => {
    const view = mount('a')
    type(view, 'b')
    const pane = document.createElement('div')
    pane.className = 'mdpm-caret-pane'
    document.body.appendChild(pane)
    blur(view, pane)
    expect(onClose).not.toHaveBeenCalled()
    blur(view)
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('ab')
    expect(onClose).toHaveBeenCalledOnce()
    pane.remove()
  })

  it('an invalid value is marked on the editor from mount and on every change, and leaving with it cancels', () => {
    const invalid = (text: string): boolean => text.includes('!')
    const view = mount('ok!', { invalid })
    expect(view.dom.getAttribute('aria-invalid')).toBe('true')
    expect(view.dom.classList.contains(invalidInput)).toBe(true)
    act(() => view.dispatch({ changes: { from: 2, to: 3 } }))
    expect(view.dom.getAttribute('aria-invalid')).toBe('false')
    type(view, '!')
    expect(view.dom.getAttribute('aria-invalid')).toBe('true')
    press(view, 'Enter')
    expect(onCommit).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
    blur(view)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('a click inside the field never reaches the seat around it', () => {
    const seat = vi.fn()
    act(() =>
      root.render(
        // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the seat under test
        <span onClick={seat}>
          <ValueEditor
            initial="a"
            holder={undefined}
            host={host}
            oneLine
            onCommit={onCommit}
            onClose={onClose}
          />
        </span>,
      ),
    )
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!
    act(() => {
      view.contentDOM.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(seat).not.toHaveBeenCalled()
  })

  it('an outside write replaces a clean field and leaves a dirty one alone', () => {
    const view = mount('a')
    mount('b')
    expect(doc(view)).toBe('b')
    type(view, '!')
    mount('c')
    expect(doc(view)).toBe('b!')
  })
})

describe('ValueEditor seated on the link target', () => {
  it('selects the whole of a bare address', () => {
    const view = mount('https://example.com', { seat: 'editLink' })
    const { from, to } = view.state.selection.main
    expect([from, to]).toEqual([0, 19])
  })
})

describe('ValueEditor seated in the alias slot', () => {
  it('selects a written alias', () => {
    const view = mount('[[Alpha|Mine]]', { seat: 'rename' })
    const { from, to } = view.state.selection.main
    expect(doc(view).slice(from, to)).toBe('Mine')
    expect(document.activeElement).toBe(view.contentDOM)
  })

  it('opens an empty slot after the pipe where none is written', () => {
    const view = mount('[[Alpha]]', { seat: 'rename' })
    expect(doc(view)).toBe('[[Alpha|]]')
    expect(view.state.selection.main.head).toBe(8)
    expect(document.activeElement).toBe(view.contentDOM)
  })

  it('seats an unresolved link’s alias slot rather than its title', () => {
    const view = mount('[[Zeta]]', { seat: 'rename' })
    expect(doc(view)).toBe('[[Zeta|]]')
    expect(view.state.selection.main.head).toBe(7)
  })

  it('gives a bare address a markdown label and seats the caret in it', () => {
    const view = mount('https://example.com', { seat: 'rename' })
    expect(doc(view)).toBe('[](https://example.com)')
    expect(view.state.selection.main.head).toBe(1)
    expect(document.activeElement).toBe(view.contentDOM)
  })

  it('Escape after emptying the slot ends the edit, so the unmount writes no collapsed link', () => {
    const view = mount('[[Alpha|Mine]]', { seat: 'rename' })
    type(view, '', 'delete.backward')
    press(view, 'Escape')
    expect(onClose).toHaveBeenCalledOnce()
    act(() => root.unmount())
    root = createRoot(container)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('an emptied slot collapses through the settle before the commit reads it', () => {
    const view = mount('[[Alpha|Mine]]', { seat: 'rename' })
    type(view, '', 'delete.backward')
    expect(doc(view)).toBe('[[Alpha|]]')
    press(view, 'Enter')
    press(view, 'Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('[[Alpha]]')
  })
})

describe('ValueEditor and alias memory', () => {
  const remembered = (remembers?: Remembers): ReturnType<typeof vi.spyOn> => {
    const edit = vi.spyOn(host.aliases, 'edit')
    const view = mount('[[Alpha|]]', { remembers })
    act(() => view.dispatch({ selection: { anchor: 8 } }))
    type(view, 'nick')
    press(view, 'Enter')
    press(view, 'Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('[[Alpha|nick]]')
    return edit
  }
  afterEach(() => vi.restoreAllMocks())

  it('remembers a typed alias on leave by default', () => {
    expect(remembered()).toHaveBeenCalledExactlyOnceWith('p1', { op: 'add', alias: 'nick' })
  })

  it('remembers nothing where the caller holds the memory', () => {
    expect(remembered('never')).not.toHaveBeenCalled()
  })

  // The alias typed, and the caret moved out of its link, which is where `leave` memory would write.
  const left = (): { view: EditorView; edit: ReturnType<typeof vi.spyOn> } => {
    const edit = vi.spyOn(host.aliases, 'edit')
    const view = mount('[[Alpha|]]', { remembers: 'flush' })
    act(() => view.dispatch({ selection: { anchor: 8 } }))
    type(view, 'nick')
    act(() => view.dispatch({ selection: { anchor: doc(view).length } }))
    expect(edit).not.toHaveBeenCalled()
    return { view, edit }
  }

  it('under flush, remembers once the edit commits', () => {
    const { view, edit } = left()
    press(view, 'Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('[[Alpha|nick]]')
    expect(edit).toHaveBeenCalledExactlyOnceWith('p1', { op: 'add', alias: 'nick' })
  })

  it('under flush, Escape remembers nothing, through the blur a removed editor fires included', () => {
    const { view, edit } = left()
    press(view, 'Escape')
    blur(view)
    act(() => root.unmount())
    root = createRoot(container)
    expect(onCommit).not.toHaveBeenCalled()
    expect(edit).not.toHaveBeenCalled()
  })
})
