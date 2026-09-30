// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { EditorView } from '@codemirror/view'
import type { ConnectionsApi } from './connectionsApi'
import { buildPageIndex, type ConnPage } from '../../Connections/pageIndex'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '../../Testing/editorHarness'
import { travelToHeading } from '../travel'
import { applyLinkAction } from './linkEdit'

vi.mock('../travel', async (orig) => ({
  ...(await orig<typeof import('../travel')>()),
  travelToHeading: vi.fn(),
}))

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

const opened = vi.fn()
const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: (p: ConnPage, heading?: string) => opened(p.id, heading),
}

// jsdom measures nothing, so the click point is pinned through posAtCoords; the span is re-queried before each dispatch, since seating the caret changes its class and CM replaces the element.
const linkSpan = (view: EditorView): HTMLElement =>
  (view.dom.querySelector('.md-connection-resolved') ?? view.dom) as HTMLElement

const clickAt = (view: EditorView, pos: number, caretBefore = 0): void => {
  view.dispatch({ selection: { anchor: caretBefore } })
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  linkSpan(view).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  view.dispatch({ selection: { anchor: pos } })
  linkSpan(view).dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
}

describe('a connection acts on its text, and leaves its edges to the caret', () => {
  it('a click on the link text navigates', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    clickAt(view, 6)
    expect(opened).toHaveBeenCalledWith('p1', undefined)
  })

  it('a click on a link to another page’s heading hands the heading on', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha#Setup]] b', connections: conn })
    await act(async () => view.focus())
    clickAt(view, 6)
    expect(opened).toHaveBeenCalledWith('p1', 'Setup')
  })

  it('a link the caret was already inside when pressed does not navigate', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    clickAt(view, 6, 6)
    expect(opened).not.toHaveBeenCalled()
  })

  it('a click in the space past a link does not follow it', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(9)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    view.contentDOM.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    expect(opened).not.toHaveBeenCalled()
  })

  it('a click that clamps into a resting link seats at the nearer bracket edge', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(9)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(view.state.selection.main.head).toBe(11)

    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(4)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(view.state.selection.main.head).toBe(2)
  })

  it('a click at the leading edge does not navigate', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    clickAt(view, 2)
    expect(opened).not.toHaveBeenCalled()
  })

  it('a click at the trailing edge does not navigate', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    clickAt(view, 11)
    expect(opened).not.toHaveBeenCalled()
  })

  it('both content bounds still count as the link itself', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    for (const pos of [4, 9]) {
      opened.mockClear()
      clickAt(view, pos)
      expect(opened).toHaveBeenCalledWith('p1', undefined)
    }
  })

  it('Edit Title on the second of two touching links acts on the second', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha]][[Alpha]]', connections: conn })
    applyLinkAction(view, 'rename', [9, 18])
    expect(view.state.sliceDoc(9, 19)).toBe('[[Alpha|]]')
    expect(view.state.selection.main.head).toBe(17)
  })
})

describe('a link that leads nowhere still takes the caret where it was pressed', () => {
  const ambiguous: ConnectionsApi = {
    ...buildPageIndex([
      { id: 'b1', title: 'Beta', path: 'Notes/Beta.md' },
      { id: 'b2', title: 'Beta', path: 'Other/Beta.md' },
    ]),
    open: (p: ConnPage, heading?: string) => opened(p.id, heading),
  }

  const bracketEdges = [2, 10]

  it('a press inside an unresolved link is left to the editor', async () => {
    const view = await mountEditor({ initialBody: 'a [[Zeta]] b', connections: conn })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(7)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(bracketEdges).not.toContain(view.state.selection.main.head)
  })

  it('a press on an ambiguous link’s text is left to the editor', async () => {
    const view = await mountEditor({ initialBody: 'a [[Beta]] b', connections: ambiguous })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(6)
    const span = view.dom.querySelector('.md-connection-ambiguous') as HTMLElement
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(bracketEdges).not.toContain(view.state.selection.main.head)
  })

  it('but one still seats at the nearer edge when the press clamped in from beside it', async () => {
    const view = await mountEditor({ initialBody: 'a [[Beta]] b', connections: ambiguous })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(8)
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    expect(view.state.selection.main.head).toBe(10)
  })
})

describe('a same-page heading link travels instead of opening', () => {
  it('a click on [[#Setup]] travels to the heading from the link’s own position', async () => {
    opened.mockClear()
    vi.mocked(travelToHeading).mockClear()
    const view = await mountEditor({ initialBody: '## Setup\n\n[[#Setup]]', connections: conn })
    await act(async () => view.focus())
    clickAt(view, 14)
    expect(opened).not.toHaveBeenCalled()
    expect(travelToHeading).toHaveBeenCalledWith(view, 'Setup', 12)
  })

  it('a click on [x](#Setup) travels the same way', async () => {
    opened.mockClear()
    vi.mocked(travelToHeading).mockClear()
    const view = await mountEditor({ initialBody: '## Setup\n\n[x](#Setup)', connections: conn })
    await act(async () => view.focus())
    clickAt(view, 11)
    expect(travelToHeading).toHaveBeenCalledWith(view, 'Setup', 11)
  })
})

describe('a heading link in a table cell travels in the page around the table', () => {
  const opener = vi.fn()

  const mountTable = async (row: string): Promise<EditorView> => {
    const view = await mountEditor({
      initialBody: `## Setup\n\ntext\n\n| A | B |\n| --- | --- |\n${row}`,
      connections: conn,
      host: { openLink: opener },
    })
    for (let i = 0; !editorContainer().querySelector('.mdpm-tbl-cell-static') && i < 50; i++)
      await act(() => new Promise((r) => setTimeout(r, 20)))
    return view
  }

  const press = (el: Element): Promise<void> =>
    act(async () => {
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
      el.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
      )
    })

  const cellEditors = (view: EditorView): NodeListOf<Element> =>
    view.dom.querySelectorAll('.mdpm-tbl-widget .cm-editor')

  it('a resting [[#Setup]] travels instead of opening the cell', async () => {
    vi.mocked(travelToHeading).mockClear()
    const view = await mountTable('| [[#Setup]] | [go](#Setup) x |')
    await press(
      view.dom.querySelector('.mdpm-tbl-cell-static .md-connection-resolved') as HTMLElement,
    )
    expect(travelToHeading).toHaveBeenCalledWith(view, 'Setup', 16)
    expect(cellEditors(view)).toHaveLength(0)
  })

  it('a live cell’s [go](#Setup) travels in the page, not the cell', async () => {
    vi.mocked(travelToHeading).mockClear()
    const view = await mountTable('| [[#Setup]] | [go](#Setup) x |')
    await press(view.dom.querySelectorAll('tbody .mdpm-tbl-cell-static')[1])
    const inner = EditorView.findFromDOM(cellEditors(view)[0] as HTMLElement)
    if (!inner) throw new Error('the cell never went live')
    await act(async () => inner.focus())
    inner.dispatch({ selection: { anchor: inner.state.doc.length } })
    vi.spyOn(inner, 'posAtCoords').mockReturnValue(1)
    const link = (): Element => inner.dom.querySelector('.md-connection-resolved') as Element
    link().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    inner.dispatch({ selection: { anchor: 1 } })
    link().dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    expect(travelToHeading).toHaveBeenCalledWith(view, 'Setup', 16)
  })

  it('a resting footnote marker whose footnote is [[#Setup]] travels to Setup', async () => {
    vi.mocked(travelToHeading).mockClear()
    const view = await mountTable('| a[^1] | b |\n\n[^1]: [[#Setup]]')
    await press(view.dom.querySelector('.mdpm-tbl-cell-static .md-citation-reference') as Element)
    expect(travelToHeading).toHaveBeenCalledWith(view, 'Setup', 16)
  })

  it('a live cell draws a heading the page holds as present', async () => {
    const view = await mountTable('| [[#Setup]] x | b |')
    await press(view.dom.querySelectorAll('tbody .mdpm-tbl-cell-static')[0])
    const inner = EditorView.findFromDOM(cellEditors(view)[0] as HTMLElement)
    if (!inner) throw new Error('the cell never went live')
    inner.dispatch({ selection: { anchor: inner.state.doc.length } })
    expect(inner.dom.querySelector('.md-connection-heading')).not.toBeNull()
    expect(inner.dom.querySelector('.md-connection-heading-missing')).toBeNull()
  })

  it('a live cell draws a heading the page lacks as missing', async () => {
    const view = await mountTable('| [[#Gone]] x | b |')
    await press(view.dom.querySelectorAll('tbody .mdpm-tbl-cell-static')[0])
    const inner = EditorView.findFromDOM(cellEditors(view)[0] as HTMLElement)
    if (!inner) throw new Error('the cell never went live')
    inner.dispatch({ selection: { anchor: inner.state.doc.length } })
    expect(inner.dom.querySelector('.md-connection-heading-missing')).not.toBeNull()
  })

  it('an open cell redraws a heading link once the page gains its heading', async () => {
    const view = await mountTable('| [[#Gone]] x | b |')
    await press(view.dom.querySelectorAll('tbody .mdpm-tbl-cell-static')[0])
    const inner = EditorView.findFromDOM(cellEditors(view)[0] as HTMLElement)
    if (!inner) throw new Error('the cell never went live')
    inner.dispatch({ selection: { anchor: inner.state.doc.length } })
    await act(async () => view.dispatch({ changes: { from: 0, insert: '## Gone\n' } }))
    expect(inner.dom.querySelector('.md-connection-heading')).not.toBeNull()
    expect(inner.dom.querySelector('.md-connection-heading-missing')).toBeNull()
  })

  it('a resting cell draws a heading the page lacks as missing, and redraws once the page gains it', async () => {
    const view = await mountTable('| [[#Gone]] | b |')
    const heading = (): Element | null =>
      view.dom.querySelector('.mdpm-tbl-cell-static .md-connection-heading')
    expect(heading()?.classList.contains('md-connection-heading-missing')).toBe(true)
    await act(async () => view.dispatch({ changes: { from: 0, insert: '## Gone\n' } }))
    expect(heading()?.classList.contains('md-connection-heading-missing')).toBe(false)
  })

  it('a live cell’s footnote marker follows its footnote in the page', async () => {
    vi.mocked(travelToHeading).mockClear()
    const view = await mountTable('| a[^1] | b |\n\n[^1]: [[#Setup]]')
    await press(view.dom.querySelectorAll('tbody .mdpm-tbl-cell-static')[0])
    const inner = EditorView.findFromDOM(cellEditors(view)[0] as HTMLElement)
    if (!inner) throw new Error('the cell never went live')
    await act(async () => inner.focus())
    inner.dispatch({ selection: { anchor: 0 } })
    const glyph = (): Element => inner.dom.querySelector('.md-citation-reference') as Element
    glyph().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    glyph().dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    expect(travelToHeading).toHaveBeenCalledWith(view, 'Setup', 16)
  })

  it('a live cell’s footnote marker offers no footnote menu, as a resting cell’s offers none', async () => {
    const citation = vi.fn(async () => null)
    const view = await mountEditor({
      initialBody: '## Setup\n\n| A | B |\n| --- | --- |\n| a[^1] | b |\n\n[^1]: note',
      connections: conn,
      host: { menus: { citation } },
    })
    for (let i = 0; !editorContainer().querySelector('.mdpm-tbl-cell-static') && i < 50; i++)
      await act(() => new Promise((r) => setTimeout(r, 20)))
    await press(view.dom.querySelectorAll('tbody .mdpm-tbl-cell-static')[0])
    const glyph = cellEditors(view)[0].querySelector('.md-citation-reference') as Element
    glyph.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
    )
    expect(citation).not.toHaveBeenCalled()
  })

  it('a resting page link navigates rather than dropping the caret into its syntax', async () => {
    opened.mockClear()
    const view = await mountTable('| [[Alpha]] | b |')
    await press(view.dom.querySelector('.mdpm-tbl-cell-static .md-connection-resolved') as Element)
    expect(opened).toHaveBeenCalledWith('p1', undefined)
    expect(cellEditors(view)).toHaveLength(0)
  })

  it('a resting link to another page’s heading hands the heading on', async () => {
    opened.mockClear()
    const view = await mountTable('| [[Alpha#Setup]] | b |')
    await press(view.dom.querySelector('.mdpm-tbl-cell-static .md-connection-resolved') as Element)
    expect(opened).toHaveBeenCalledWith('p1', 'Setup')
  })

  it('a resting web link follows to the system browser on a click', async () => {
    opener.mockReset()
    const view = await mountTable('| [Home](https://x.test) | b |')
    await press(view.dom.querySelector('.mdpm-tbl-cell-static .md-link') as Element)
    expect(opener).toHaveBeenCalledWith('https://x.test')
    expect(cellEditors(view)).toHaveLength(0)
  })
})

describe('a bare §Heading run carries no menu and no glance, just travel', () => {
  const arm = vi.fn()

  const mountAutomatic = () =>
    mountEditor({
      initialBody: '## Setup\nsee §Setup.',
      connections: conn,
      host: {
        settings: { inPageHeadingResolution: 'automatic' },
        glance: { arm, cancel: () => {}, close: () => {}, contains: () => false },
      },
    })

  it('a click on the run travels to the heading', async () => {
    vi.mocked(travelToHeading).mockClear()
    const view = await mountAutomatic()
    await act(async () => view.focus())
    const span = view.dom.querySelector('.md-section-run') as HTMLElement
    vi.spyOn(view, 'posAtCoords').mockReturnValue(14)
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    span.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    expect(travelToHeading).toHaveBeenCalledWith(view, 'Setup', 13)
  })

  it('hovering the run arms nothing', async () => {
    arm.mockClear()
    const view = await mountAutomatic()
    const span = view.dom.querySelector('.md-section-run') as HTMLElement
    vi.spyOn(view, 'posAtCoords').mockReturnValue(14)
    span.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(arm).not.toHaveBeenCalled()
  })

  it('right-click on the run falls through to the native editor menu', async () => {
    const view = await mountAutomatic()
    const span = view.dom.querySelector('.md-section-run') as HTMLElement
    vi.spyOn(view, 'posAtCoords').mockReturnValue(14)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    span.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('a right-press on a link keeps the caret out, so its own menu opens', () => {
  const press = (el: Element): MouseEvent => {
    const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 })
    el.dispatchEvent(e)
    return e
  }

  it('claims the press, leaves the caret where it was, and pops the link menu', async () => {
    const menu = vi.fn()
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: { ...conn, menu } })
    view.focus()
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(6)
    expect(press(linkSpan(view)).defaultPrevented).toBe(true)
    expect(view.state.selection.main.head).toBe(0)
    linkSpan(view).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    expect(menu).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'page', editable: true, hasAlias: false }),
    )
  })

  it('leaves a right-press on plain text to the browser', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(0)
    expect(press(view.dom.querySelector('.cm-line') as Element).defaultPrevented).toBe(false)
  })
})
