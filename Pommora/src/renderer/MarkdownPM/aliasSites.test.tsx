// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { EditorView } from '@codemirror/view'
import {
  buildPageIndex,
  type ConnectionsApi,
  type ConnPage,
} from '@renderer/MarkdownPM/Connections'
import { renderCellContent } from '@renderer/MarkdownPM/Tables/cellStatic'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/Testing/editorHarness'

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

// The title resolves and the alias is a DUPLICATED title, so the two spans disagree about status
// as well as target. Reading the displayed span instead of the resolve span therefore changes the
// rendered class and drops the click entirely — a fixture whose spans merely differ in text can't
// show that, because the displayed text is correct either way.
const DOC = '[[Alpha|Beta]]'
const opened = vi.fn()
const conn: ConnectionsApi = {
  ...buildPageIndex([
    { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
    { id: 'p2', title: 'Beta', path: 'Notes/Beta.md' },
    { id: 'p3', title: 'Beta', path: 'Archive/Beta.md' },
  ]),
  open: (p: ConnPage) => opened(p.id),
}

// The same link with prose either side, so there are offsets OUTSIDE the token — `DOC` alone is the
// whole document, where even 0 sits inside the link and no "caret elsewhere" case can be posed.
// Token [2,16]; the displayed alias `Beta` is [10,14].
const PADDED = `x ${DOC} y`

// CM seats the caret on mousedown, so a rule about "was I already editing this" has to be driven by
// the real order — press, caret moves, click. A bare click() dispatch tests a sequence never run.
// Re-queried per dispatch: activating the token changes its class, so CM replaces the element and a
// held reference is detached — an event on it never reaches the editor.
const linkSpan = (view: EditorView): HTMLElement =>
  view.dom.querySelector('.md-connection-resolved') as HTMLElement

function pressAndClick(view: EditorView, pos: number, caretBefore: number): void {
  view.dispatch({ selection: { anchor: caretBefore } })
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  linkSpan(view).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  view.dispatch({ selection: { anchor: pos } })
  linkSpan(view).dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
}

async function renderCell(text: string): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () =>
    root.render(
      createElement(
        'div',
        null,
        renderCellContent(text, () => conn),
      ),
    ),
  )
  return host
}

describe('every site resolves an aliased connection by the same span', () => {
  it('the editor shows the alias and resolves the title', async () => {
    const view = await mountEditor({ initialBody: DOC, connections: conn })
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    expect(span?.textContent).toBe('Beta')
  })

  it('a table cell agrees with the editor, tail and all', async () => {
    const host = await renderCell(DOC)
    const span = host.querySelector('.md-connection-resolved') as HTMLElement
    expect(span?.textContent).toBe('Beta')
    expect(host.textContent).toBe('Beta')
  })

  it('clicking it opens the page the title names, not the one the alias does', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: PADDED, connections: conn })
    await act(async () => view.focus())
    pressAndClick(view, 12, 0)
    expect(opened).toHaveBeenCalledWith('p1')
  })

  // The table's hover handler reaches a cell connection through the DOM, with no token to ask, so
  // the resolve key has to travel on the span. Reading its text would resolve the alias instead.
  it('a cell connection carries its resolve key, not just its text', async () => {
    const host = await renderCell(DOC)
    const el = host.querySelector('.md-connection-resolved') as HTMLElement
    expect(el.textContent).toBe('Beta')
    expect(el.dataset.connTitle).toBe('Alpha')
  })

  it('a link the caret is already inside does not navigate on click', async () => {
    opened.mockClear()
    const view = await mountEditor({ initialBody: PADDED, connections: conn })
    await act(async () => view.focus())
    // Click point and pre-press caret both inside the displayed alias, so only the caret rule can
    // suppress this — a point on the edge would pass for the wrong reason.
    pressAndClick(view, 12, 12)
    expect(opened).not.toHaveBeenCalled()
  })

  // The cell renderer draws contentRange and skips to the token's end, so the two renderers agree
  // only while the marker spans tile everything outside it. A degenerate `[[Title|]]` is where that
  // tiling breaks if the trailing marker is pinned to two characters.
  it('an empty alias reads identically at both renderers', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha|]]', connections: conn })
    expect(view.dom.textContent).toBe('Alpha')
    const host = await renderCell('[[Alpha|]]')
    expect(host.textContent).toBe('Alpha')
  })

  it('a bare connection reads identically at both renderers', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha]]', connections: conn })
    expect(view.dom.textContent).toBe('Alpha')
    const host = await renderCell('[[Alpha]]')
    expect(host.textContent).toBe('Alpha')
  })
})
