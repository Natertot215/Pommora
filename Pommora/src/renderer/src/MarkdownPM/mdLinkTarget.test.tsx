// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { encodeLinkTarget } from '@shared/links'
import { buildPageIndex, resolveMdTarget, type ConnectionsApi, type ConnPage } from './connections'
import { renderCellContent } from './Tables/cellStatic'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const opened = vi.fn()
const openExternal = vi.fn()
stubEditorBridge({ openExternal })

const conn: ConnectionsApi = {
  ...buildPageIndex([
    { id: 'p1', title: 'Work Notes', path: 'Notes/Work Notes.md' },
    { id: 'p2', title: 'Node.js', path: 'Notes/Node.js.md' },
  ]),
  open: (p: ConnPage) => opened(p.id),
}

let cellRoot: Root | null = null
let cellHost: HTMLDivElement | null = null

// renderCellContent returns a node tree rather than a mounted one; this puts it in a real container
// so the classes it emits can be queried exactly as the editor's are.
async function renderCell(text: string): Promise<HTMLDivElement> {
  cellHost = document.createElement('div')
  document.body.appendChild(cellHost)
  cellRoot = createRoot(cellHost)
  await act(async () => cellRoot?.render(<>{renderCellContent(text, () => conn)}</>))
  return cellHost
}

beforeEach(() => {
  opened.mockReset()
  openExternal.mockReset()
})
afterEach(async () => {
  await act(async () => cellRoot?.unmount())
  cellHost?.remove()
  cellRoot = null
  cellHost = null
  await cleanupEditor()
})

describe('what a markdown link’s target names', () => {
  it('reads an encoded page title as that page', () => {
    const t = resolveMdTarget(conn, encodeLinkTarget('Work Notes'))
    expect(t.kind === 'page' && t.page.id).toBe('p1')
  })

  // isValidLink accepts any dotted host, so resolution has to run first or a page called Node.js
  // becomes permanently unreachable through this syntax.
  it('a dotted title beats the URL gate', () => {
    const t = resolveMdTarget(conn, 'Node.js')
    expect(t.kind === 'page' && t.page.id).toBe('p2')
  })

  it('a real URL stays external, and a page by its last path segment does not exist', () => {
    expect(resolveMdTarget(conn, 'https://example.com').kind).toBe('external')
    expect(resolveMdTarget(conn, 'https://example.com/Work%20Notes').kind).toBe('external')
  })

  it('neither a page nor a URL is invalid, exactly as before', () => {
    expect(resolveMdTarget(conn, 'not a url').kind).toBe('invalid')
  })

  it('a %-bearing target resolves to something rather than throwing', () => {
    expect(() => resolveMdTarget(conn, 'Revenue 50% plan')).not.toThrow()
  })
})

// The two syntaxes must reach the same page, and the two renderers must say the same thing about it
// — a link coloured as a connection in the body and as broken in a cell is one link with two truths.
describe('both syntaxes and both renderers agree', () => {
  const target = encodeLinkTarget('Work Notes')

  it('the markdown form and the wikilink form reach the same page', () => {
    const md = resolveMdTarget(conn, target)
    const wiki = conn.resolve('Work Notes')
    expect(md.kind === 'page' && md.page.id).toBe(wiki.page?.id)
  })

  it('the cell renderer paints an internal target as a connection', async () => {
    const container = await renderCell(`see [the notes](${target}) end`)
    expect(container.querySelector('.md-connection-resolved')?.textContent).toBe('the notes')
    expect(container.querySelector('.md-link')).toBeNull()
  })

  it('the editor paints the same target the same way', async () => {
    const view = await mountEditor({
      initialBody: `see [the notes](${target}) end`,
      connections: conn,
    })
    await act(async () => view.focus())
    expect(view.dom.querySelector('.md-connection-resolved')?.textContent).toBe('the notes')
  })

  it('and an external one still reads as a plain link on both', async () => {
    const container = await renderCell('see [site](https://example.com) end')
    expect(container.querySelector('.md-link')?.textContent).toBe('site')
    const view = await mountEditor({
      initialBody: 'see [site](https://example.com) end',
      connections: conn,
    })
    expect(view.dom.querySelector('.md-link')?.textContent).toBe('site')
  })
})

describe('following one', () => {
  it('an internal target navigates instead of leaving the app', async () => {
    const body = `see [the notes](${encodeLinkTarget('Work Notes')}) end`
    const view = await mountEditor({ initialBody: body, connections: conn })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(6)
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    span.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    expect(opened).toHaveBeenCalledWith('p1')
    expect(openExternal).not.toHaveBeenCalled()
  })
})

