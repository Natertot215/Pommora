// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { decorationsFor } from '../Testing/markdownEngine'
import { testHost } from '../Testing/editorHarness'
import { tokenize } from './Engine/tokens'
import { scanDoc } from './Engine/docScan'
import { canonicalizeCheckbox, smartBackspace } from './Input/edits'
import { editorHost, heldPage } from './api'
import { inlineSurface } from './surface'
import { buildPageIndex } from '../Connections/pageIndex'
import type { ConnectionsApi } from './Links/connectionsApi'
import { followTarget } from './Links/linkClicks'

if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const holder = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
const conn: ConnectionsApi = {
  ...buildPageIndex([holder]),
  open: () => {},
  menu: vi.fn(),
  headingsOf: (path) => (path === holder.path ? ['setup'] : undefined),
}

let views: EditorView[] = []
afterEach(() => {
  for (const v of views) v.destroy()
  views = []
})
const mount = (doc: string, ...extensions: Extension[]): EditorView => {
  const view = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [editorHost.of(testHost()), inlineSurface(() => conn, 'text'), ...extensions],
    }),
  })
  views.push(view)
  return view
}

describe('the text scope', () => {
  it('reads a list marker, a task, and a heading as prose', () => {
    for (const line of ['- item', '1. item', '- [ ] item', '# heading'])
      expect(decorationsFor(line, [], new Set(), -1, undefined, 'text')).toEqual([])
  })

  it('reads the inline marks and links as a page does', () => {
    const marks = {
      '**bold**': 'md-bold',
      _italic_: 'md-italic',
      '==mark==': 'md-highlight',
      '`code`': 'md-code',
    }
    for (const [line, className] of Object.entries(marks)) {
      const text = `- a ${line} b`
      const read = decorationsFor(text, tokenize(text), new Set(), -1, undefined, 'text')
      expect(read.some((i) => i.kind === 'class' && i.className === className)).toBe(true)
      expect(read.some((i) => i.kind === 'class' && i.className.includes('md-list'))).toBe(false)
    }
    const link = 'see [[Page]]'
    expect(decorationsFor(link, tokenize(link), new Set(), -1, undefined, 'text')).toEqual(
      decorationsFor(link, tokenize(link), new Set(), -1),
    )
  })

  it('collapses no marker on Backspace and canonicalizes no task box', () => {
    const doc = '- a'
    expect(smartBackspace(scanDoc(doc), 2, 2, 'text')).toBeNull()
    expect(smartBackspace(scanDoc(doc), 2, 2, 'cell')).not.toBeNull()
    expect(canonicalizeCheckbox('-[]', 3, 3, ' ', 'text')).toBeNull()
    expect(canonicalizeCheckbox('-[]', 3, 3, ' ', 'cell')).not.toBeNull()
  })

  it('draws no grip, glyph, or renumber on its surface', () => {
    const view = mount('1. a\n2. b\n3. c')
    expect(view.dom.querySelector('.md-block-handle, [class*="md-list-"]')).toBeNull()
    view.dispatch({ changes: { from: 4, to: 9 }, userEvent: 'delete' })
    expect(view.state.doc.toString()).toBe('1. a\n3. c')
  })
})

describe('a bare heading in a Text value', () => {
  it('answers to the page holding the value, not to a `#` line of its own', () => {
    const view = mount('# Gone\n[[#Setup]] and [[#Gone]] x', heldPage.of(holder))
    const headings = [...view.dom.querySelectorAll('.md-connection-heading')]
    expect(headings.map((h) => h.textContent)).toEqual(['Setup', 'Gone'])
    expect(headings.map((h) => h.classList.contains('md-connection-heading-missing'))).toEqual([
      false,
      true,
    ])
  })

  it('follows to the page holding the value', () => {
    const opened = vi.fn()
    const view = mount('[[#Setup]] x', heldPage.of(holder))
    const go = followTarget(
      { kind: 'self', heading: 'Setup' },
      { ...conn, open: (page, heading) => opened(page.id, heading) },
      { target: view.contentDOM, metaKey: false, ctrlKey: false },
    )
    go?.()
    expect(opened).toHaveBeenCalledWith('p1', 'Setup')
  })

  it('acts on hover and right-click as the resting value does', () => {
    const arm = vi.fn()
    const glance = { arm, cancel() {}, close() {}, contains: () => false }
    const view = mount(
      '[[#Setup]] x',
      heldPage.of(holder),
      Prec.highest(editorHost.of(testHost({ glance }))),
    )
    vi.spyOn(view, 'posAtCoords').mockReturnValue(5)
    const heading = view.dom.querySelector('.md-connection-heading') as HTMLElement
    heading.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(arm).toHaveBeenCalledWith(
      { kind: 'page', id: 'p1', path: 'Notes/Alpha.md', heading: 'Setup' },
      heading,
    )
    heading.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    expect(conn.menu).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'page', page: holder, heading: 'Setup' }),
    )
  })

  it('goes unjudged when the seat names no page', () => {
    const view = mount('[[#Gone]] x', heldPage.of(null))
    expect(view.dom.querySelector('.md-connection-heading')).not.toBeNull()
    expect(view.dom.querySelector('.md-connection-heading-missing')).toBeNull()
  })
})
