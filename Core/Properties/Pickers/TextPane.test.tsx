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
import { blockQuery } from '../../MarkdownPM/Menus/blockQuery'
import { writeLinkAt } from '../../MarkdownPM/Links/pendingTitle'
import { useEditorHost } from '../../Pages/editorHost'
import { previewConnections } from '../../Session/pageConnections'

const ALPHA = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
const ALPHA_HEADINGS = {
  [ALPHA.path]: { keys: ['setup'], texts: ['Setup'], outline: [{ text: 'Setup', level: 2 }] },
}
let answerTitle: (v: unknown) => void = () => {}
stubEditorBridge({
  'linkTitles:fetch': () => new Promise((r) => (answerTitle = r)),
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

// The seat as the surfaces hold it: mounted across closes, its writer retired in its own passive cleanup, its host built as the field builds one.
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
  const editorHost = useEditorHost({ connections: useSession(() => previewConnections()) })
  return (
    <span ref={triggerRef}>
      <TextPane
        current={current}
        holder={holder}
        host={editorHost}
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
  it('Enter and Shift-Enter each write a line break; Tab stays in the editor and inserts nothing', async () => {
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
    expect(doc()).toBe('x\na\n')
    await exited()
    expect(pane()).not.toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Enter in an alias rests past the link, and a second Enter breaks the line', async () => {
    render(text('see [[Alpha|al]] x'))
    act(() => view().dispatch({ selection: { anchor: 13 } }))
    press('Enter')
    expect(view().state.selection.main.head).toBe(16)
    await exited()
    expect(pane()).not.toBeNull()
    press('Enter')
    expect(doc()).toBe('see [[Alpha|al]]\n x')
    await exited()
    expect(pane()).not.toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('an alias typed into a link and closed by Escape is remembered, and an emptied alias saves collapsed', () => {
    const mutate = vi.spyOn(useSession.getState(), 'mutate').mockResolvedValue(null)
    const edit = (from: number, to: number, insert: string): void =>
      act(() => {
        view().dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
          userEvent: insert ? 'input.type' : 'delete.backward',
        })
      })
    render(text('see [[Alpha|]] x'))
    edit(12, 12, 'new')
    act(() => view().dispatch({ selection: { anchor: 8 } }))
    press('Escape')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('see [[Alpha|new]] x'))
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'editAliases', edit: { op: 'add', alias: 'new' } }),
    )

    onCommit.mockClear()
    render(text('see [[Alpha|y]] x'))
    act(() => reopen())
    edit(12, 13, '')
    act(() => view().dispatch({ selection: { anchor: 8 } }))
    press('Escape')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('see [[Alpha]] x'))
    mutate.mockRestore()
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

  it('Escape over a selection saves and closes in one press', async () => {
    render(text('xy'))
    typeAtEnd('z')
    act(() => view().dispatch({ selection: { anchor: 0, head: 2 } }))
    press('Escape')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('xyz'))
    await exited()
    expect(pane()).toBeNull()
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

  it('leaves a value a tool wrote with \\r\\n as it was when closed untouched, and saves it as written once edited', async () => {
    render(text('- a\r\n- b'))
    expect(doc()).toBe('- a\n- b')
    press('Escape')
    await exited()
    expect(onCommit).not.toHaveBeenCalled()

    act(() => reopen())
    typeAtEnd('c')
    press('Escape')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('- a\n- bc'))
  })

  it('takes an outside write with \\r\\n as the document holds it, and closes with nothing to save', () => {
    render(text('a\r\nb'))
    render(text('c\r\nd'))
    expect(doc()).toBe('c\nd')
    press('Escape')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('unmounting the pane while its seat unmounts still lands the typed text (the layout cleanup runs before the seat’s passive one)', () => {
    render(text('x'))
    typeAtEnd('y')
    act(() => root.render(null))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('xy'))
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

  it('closing with a title pending commits the short form and nothing once it lands', async () => {
    const url = 'https://pane.example.com'
    const short = `[pane.example.com](${url})`
    render(null)
    act(() => writeLinkAt(view(), 0, 0, { text: short, awaits: url }, 'input.paste'))
    press('Escape')
    await exited()
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text(short))
    await act(async () => answerTitle({ ok: true, value: { title: 'Pane' } }))
    expect(onCommit).toHaveBeenCalledOnce()
  })

  it('a blank pane over an empty value commits nothing', async () => {
    render(null)
    typeAtEnd('   ')
    press('Escape')
    await exited()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('offers the holding page’s headings for a bare `#`, never a `#` line of the value', async () => {
    useSession.setState({ headings: ALPHA_HEADINGS })
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
      headings: ALPHA_HEADINGS,
    })
    render(text('see '), ALPHA)
    vi.spyOn(view(), 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    typeAtEnd('§')
    await act(() => new Promise<void>((r) => setTimeout(r, 50)))
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })
})

describe('a list in the pane', () => {
  it('wraps and spellchecks as a body does', () => {
    render(text('x'))
    expect(view().contentDOM.classList.contains('cm-lineWrapping')).toBe(true)
    expect(view().contentDOM.getAttribute('spellcheck')).toBe('true')
  })

  it('reads a first-line marker as a list, and draws its grip', () => {
    render(text('- milk'))
    expect(document.querySelector('.text-pane .cm-line.md-list-item')).not.toBeNull()
    expect(document.querySelector('.text-pane .md-block-handle')).not.toBeNull()
  })

  it('Enter continues an item and breaks a plain line flush, Tab and Shift-Tab nest and outdent, and Shift-Enter stays a plain break', async () => {
    render(text('- milk'))
    expect(press('Enter')).toBe(true)
    expect(doc()).toBe('- milk\n- ')
    expect(press('Tab')).toBe(true)
    expect(doc()).toBe('- milk\n\t- ')
    expect(press('Tab', true)).toBe(true)
    expect(doc()).toBe('- milk\n- ')
    expect(document.activeElement).toBe(view().contentDOM)
    typeAtEnd('eggs')
    press('Enter', true)
    expect(doc()).toBe('- milk\n- eggs\n')
    typeAtEnd('  then')
    press('Enter')
    expect(doc()).toBe('- milk\n- eggs\n  then\n')
    press('Escape')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('- milk\n- eggs\n  then\n'))
    await exited()
    expect(pane()).toBeNull()
  })

  it('renumbers a run around a removed item', () => {
    render(text('1. a\n2. b\n3. c'))
    act(() => view().dispatch({ changes: { from: 4, to: 9 }, userEvent: 'delete' }))
    expect(doc()).toBe('1. a\n2. c')
  })

  it('holds no `/` menu', () => {
    render(text(''))
    expect(view().state.field(blockQuery, false)).toBeUndefined()
  })

  it('leaves a heading, a quote, and a fence as literal text', () => {
    render(text('# h\n> q\n```\nx\n```'))
    expect(
      document.querySelector('.text-pane .md-h1, .text-pane .md-blockquote, .text-pane .codeblock'),
    ).toBeNull()
  })
})
