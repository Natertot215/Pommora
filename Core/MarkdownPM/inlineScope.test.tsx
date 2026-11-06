// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import { ensureSyntaxTree, LanguageDescription } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import { javascript } from '@codemirror/lang-javascript'
import { decorationsFor } from '../Testing/markdownEngine'
import { testHost } from '../Testing/editorHarness'
import { tokenize } from './Engine/tokens'
import { scanDoc } from './Engine/docScan'
import { canonicalizeCheckbox, smartBackspace } from './Input/edits'
import { editorHost, heldOf, heldPage } from './api'
import { editorBase } from './surface'
import { wordAt } from './Input/markdownInput'
import { buildPageIndex } from '../Connections/pageIndex'
import type { ConnectionsApi } from './Links/connectionsApi'
import { followTarget } from './Links/linkClicks'
import { readLinkText, resolveLink } from '../Connections/linkValue'

const holder = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
const conn: ConnectionsApi = {
  index: buildPageIndex([holder]),
  open: () => {},
  menu: vi.fn(),
  headingsOf: (path) =>
    path === holder.path
      ? { keys: ['setup'], texts: ['Setup'], outline: [{ text: 'Setup', level: 2 }] }
      : undefined,
}

let views: EditorView[] = []
afterEach(() => {
  for (const v of views) v.destroy()
  views = []
})
const base = () =>
  editorBase({
    host: { ...testHost(), connections: () => conn },
    scope: 'inline',
    panes: [],
    formatExt: [],
  })
const mount = (doc: string, ...extensions: Extension[]): EditorView => {
  const view = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [base(), ...extensions],
    }),
  })
  views.push(view)
  return view
}

describe('the inline scope', () => {
  it('reads a list marker, a task, and a heading as prose', () => {
    for (const line of ['- item', '1. item', '- [ ] item', '# heading'])
      expect(decorationsFor(line, [], new Set(), -1, scanDoc(line, 'inline'))).toEqual([])
  })

  it('reads the inline marks and links as a page does', () => {
    const marks = {
      '**bold**': 'md-bold',
      _italic_: 'md-italic',
      '==mark==': 'md-highlight',
      '`code`': 'md-code',
      '=🔴ink=': 'md-text-color md-paint-red',
    }
    for (const [line, className] of Object.entries(marks)) {
      const text = `- a ${line} b`
      const read = decorationsFor(text, tokenize(text), new Set(), -1, scanDoc(text, 'inline'))
      expect(read.some((i) => i.kind === 'class' && i.className === className)).toBe(true)
      expect(read.some((i) => i.kind === 'class' && i.className.includes('md-list'))).toBe(false)
    }
    const link = 'see [[Page]]'
    expect(decorationsFor(link, tokenize(link), new Set(), -1, scanDoc(link, 'inline'))).toEqual(
      decorationsFor(link, tokenize(link), new Set(), -1),
    )
  })

  it('collapses no marker on Backspace and canonicalizes no task box', () => {
    const doc = '- a'
    expect(smartBackspace(scanDoc(doc, 'inline'), 2, 2)).toBeNull()
    expect(smartBackspace(scanDoc(doc, 'lists'), 2, 2)).not.toBeNull()
    expect(canonicalizeCheckbox(scanDoc('-[]', 'inline'), 3, 3, ' ')).toBeNull()
    expect(canonicalizeCheckbox(scanDoc('-[]', 'lists'), 3, 3, ' ')).not.toBeNull()
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
      resolveLink(readLinkText('[[#Setup]]'), conn.index, heldOf(view)),
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
      Prec.highest(editorHost.of({ ...testHost({ glance }), connections: () => conn })),
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

describe('a word', () => {
  const doubleClick = (view: EditorView, pos: number) => {
    const line = view.dom.querySelector('.cm-line') as HTMLElement
    vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
    vi.spyOn(view, 'posAndSideAtCoords').mockReturnValue({ pos, assoc: 1 })
    const init = { bubbles: true, cancelable: true, button: 0, detail: 2, clientX: 5, clientY: 5 }
    line.dispatchEvent(new MouseEvent('mousedown', init))
    document.dispatchEvent(new MouseEvent('mouseup', init))
    const { from, to } = view.state.selection.main
    return [from, to]
  }
  const groupFrom = (doc: string, anchor: number, key: 'ArrowLeft' | 'ArrowRight') => {
    const view = mount(doc)
    view.dispatch({ selection: { anchor } })
    runScopeHandlers(view, new KeyboardEvent('keydown', { key, ctrlKey: true }), 'editor')
    return view.state.selection.main.head
  }
  const wordIn = (doc: string, pos: number, side: -1 | 1) => {
    const word = wordAt(mount(doc).state, pos, side)
    return word && doc.slice(word.from, word.to)
  }

  it('holds an apostrophe between letters for every word gesture', () => {
    const doc = "don't it’s Ada's 'quoted' ‘quoted’ students'"
    const view = mount(doc)
    const written = ["don't", 'it’s', "Ada's", "'quoted'", '‘quoted’', "students'"]
    const words = ["don't", 'it’s', "Ada's", 'quoted', 'quoted', 'students']
    const inside = (w: string) => doc.indexOf(w) + 1
    const read = (r: { from: number; to: number } | null) => r && doc.slice(r.from, r.to)
    expect(written.map((w) => read(wordAt(view.state, inside(w), 1)))).toEqual(words)
    const pressed = written.map((w) => {
      doubleClick(view, inside(w))
      return read(view.state.selection.main)
    })
    expect(pressed).toEqual(words)
    const other = mount("don't")
    other.dispatch({ selection: { anchor: 3 } })
    runScopeHandlers(other, new KeyboardEvent('keydown', { key: 'ArrowRight' }), 'editor')
    expect(other.state.selection.main.head).toBe(4)
    const key = (key: string, shiftKey = false) =>
      runScopeHandlers(
        view,
        new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey }),
        'editor',
      )
    view.dispatch({ selection: { anchor: 0 } })
    key('ArrowRight')
    expect(view.state.selection.main.head).toBe(5)
    key('ArrowLeft', true)
    expect(read(view.state.selection.main)).toBe("don't")
    view.dispatch({ selection: { anchor: 10 } })
    key('Backspace')
    expect(view.state.doc.toString()).toBe(`don't ${doc.slice(10)}`)
    for (const [from, to, left] of [
      [2, 5, 'do stop'],
      [0, 3, "'t stop"],
    ] as const) {
      const cut = mount("don't stop")
      cut.dispatch({ selection: { anchor: from, head: to } })
      runScopeHandlers(
        cut,
        new KeyboardEvent('keydown', { key: 'Backspace', ctrlKey: true }),
        'editor',
      )
      expect(cut.state.doc.toString()).toBe(left)
    }
  })

  it('takes a quote touching a contraction', () => {
    const doc = "say 'don't' now"
    expect(wordIn(doc, 5, 1)).toBe("'don't'")
    expect(doubleClick(mount(doc), 5)).toEqual([4, 11])
    expect(wordIn("'I don't'", 4, 1)).toBe("don't'")
  })

  it("carries a neighbor's quote across a contraction's gap", () => {
    expect(groupFrom("students' don't", 10, 'ArrowLeft')).toBe(0)
    expect(groupFrom("don't 'quoted'", 5, 'ArrowRight')).toBe(14)
    expect(doubleClick(mount("don't 'quoted'"), 6)).toEqual([6, 14])
    expect(wordIn("'tis don't", 4, -1)).toBe("'tis")
  })

  it('leaves a quote no walk reaches a contraction from', () => {
    expect(groupFrom("'don't'", 0, 'ArrowRight')).toBe(1)
    expect(groupFrom("x 'don't", 1, 'ArrowRight')).toBe(3)
  })

  it('joins only a letter or digit on both sides, astral letters included', () => {
    expect(wordIn("a'_b", 0, 1)).toBe('a')
    expect(wordIn("𝒶'b", 0, 1)).toBe("𝒶'b")
  })

  it("answers ahead of a fence's language", () => {
    const doc = "```js\n// don't stop\n```"
    const js = LanguageDescription.of({ name: 'js', support: javascript() })
    const state = EditorState.create({
      doc,
      extensions: [markdown({ codeLanguages: [js] }), base()],
    })
    ensureSyntaxTree(state, doc.length, 1e9)
    const word = wordAt(state, 10, 1)!
    expect(doc.slice(word.from, word.to)).toBe("don't")
  })
})
