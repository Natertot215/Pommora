// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { encodeLinkTarget } from '@shared/links'
import { autocompleteQuery, commitEdit } from './autocomplete'
import { activeTokenIndices, tokenize } from './tokens'
import { CONN_HOVER_INTENT_MS } from './editor/connections'
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


// Naming the target finishes half the link. A markdown link's display text is free — unlike a
// connection, whose title IS its target — so the press that names the page should leave you typing
// what the link says, not hunting for the slot.
//
// Asserted on the edit rather than by driving the panel: opening it needs coordsAtPos, and jsdom
// measures nothing, so a panel-driven version of this would only ever test the harness.
describe('picking a page inside the parens', () => {
  const row = { value: 'Work Notes', label: 'Work Notes', isPage: true }

  const applied = (doc: string, caret: number): { text: string; after: string } => {
    const ac = autocompleteQuery(doc, caret)!
    expect(ac.form).toBe('target')
    const edit = commitEdit(ac, row)
    let text = doc
    for (const c of [...edit.changes].reverse()) {
      text = text.slice(0, c.from) + c.insert + text.slice(c.to)
    }
    return { text, after: text.slice(edit.anchor) }
  }

  // A markdown link renders as its label alone, so selecting that label highlights everything the
  // link shows — picking a page read as though it had selected the whole thing. It rests past the
  // closer instead, exactly where finishing a connection leaves you.
  it('fills an empty label with the page title and rests past the link', () => {
    const doc = 'see []() end'
    const { text, after } = applied(doc, doc.indexOf('(') + 1)
    expect(text).toBe('see [Work Notes](Work%20Notes) end')
    expect(after).toBe(' end')
  })

  it('leaves a written label alone and rests in the same place', () => {
    const doc = 'see [the notes]() end'
    const { text, after } = applied(doc, doc.indexOf('(') + 1)
    expect(text).toBe('see [the notes](Work%20Notes) end')
    expect(after).toBe(' end')
  })

  // The caret lands on the closer, and the link rests rendered there BECAUSE the commit put it
  // there. Clicking the same spot afterwards reveals the target, as clicking beside any link does.
  it('and the link reads as finished where the commit leaves the caret', () => {
    const doc = 'see [the notes](Work%20Notes) end'
    const tokens = tokenize(doc)
    const idx = tokens.findIndex((t) => t.kind === 'link')
    const end = tokens[idx].range[1]
    expect(activeTokenIndices(tokens, end, end, end).has(idx)).toBe(false)
    expect(activeTokenIndices(tokens, end, end).has(idx)).toBe(true)
    expect(activeTokenIndices(tokens, end - 1, end - 1, end).has(idx)).toBe(true)
  })
})

// A connection being typed should read as a link from its first character rather than as prose that
// happens to turn blue once a title matches.
describe('a connection takes its colour as it is typed', () => {
  it('an unresolved connection being typed wears the connection colour', async () => {
    const view = await mountEditor({ initialBody: 'see [[Wo]] end', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ changes: { from: 8, insert: 'r' }, selection: { anchor: 9 } })
    })
    expect(view.dom.querySelector('.md-connection-typing')?.textContent).toBe('Wor')
  })

  // Clicking into a link that names no page is inspecting an unresolved link, and it should look
  // unresolved. Only writing one earns the colour.
  it('but merely clicking into one leaves it raw', async () => {
    const view = await mountEditor({ initialBody: 'see [[Wor]] end', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 8 } })
    })
    expect(view.dom.querySelector('.md-connection-typing')).toBeNull()
  })

  it('and at rest it is plain text, exactly as before', async () => {
    const view = await mountEditor({ initialBody: 'see [[Wor]] end', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 0 } })
    })
    expect(view.dom.querySelector('.md-connection-typing')).toBeNull()
  })

  it('and one that does resolve is resolved, not typing', async () => {
    const view = await mountEditor({ initialBody: 'see [[Work Note]] end', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ changes: { from: 15, insert: 's' }, selection: { anchor: 16 } })
    })
    expect(view.dom.querySelector('.md-connection-typing')).toBeNull()
    expect(view.dom.querySelector('.md-connection-resolved')).not.toBeNull()
  })
})

// A markdown link naming a page is drawn as a connection, so it owes the same hover preview. A table
// cell already raised one for it; the body did not, because the connection handler's hit-test reads
// wikiLink tokens and this is a `link`.
describe('an internal markdown link previews like a connection', () => {
  it('arms the hover on the drawn link', async () => {
    const hover = vi.fn()
    const view = await mountEditor({
      initialBody: `see [the notes](${encodeLinkTarget('Work Notes')}) end`,
      connections: { ...conn, hover },
    })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(6)
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, CONN_HOVER_INTENT_MS + 20))
    })
    expect(hover).toHaveBeenCalled()
  })

  it('and lets it go when the pointer leaves before the dwell', async () => {
    const hover = vi.fn()
    const view = await mountEditor({
      initialBody: `see [the notes](${encodeLinkTarget('Work Notes')}) end`,
      connections: { ...conn, hover },
    })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(6)
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    span.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, CONN_HOVER_INTENT_MS + 20))
    })
    expect(hover).not.toHaveBeenCalled()
  })
})

// An empty alias offers its page's names outright — the rule is the shape on the line, not the
// gesture that produced it. And a revealed alias shows where it points, marked as such.
describe('an alias reveals what it hides', () => {
  it('marks the target with the treatment a revealed link target gets', async () => {
    const view = await mountEditor({
      initialBody: 'see [[Work Notes|the plan]] end',
      connections: conn,
    })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 20 } })
    })
    expect(view.dom.querySelector('.md-link-url')?.textContent).toBe('Work Notes')
  })

  it('and marks nothing while it is closed', async () => {
    const view = await mountEditor({
      initialBody: 'see [[Work Notes|the plan]] end',
      connections: conn,
    })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 0 } })
    })
    expect(view.dom.querySelector('.md-link-url')).toBeNull()
  })

  it('a link with no alias has no target to show', async () => {
    const view = await mountEditor({ initialBody: 'see [[Work Notes]] end', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 10 } })
    })
    expect(view.dom.querySelector('.md-link-url')).toBeNull()
  })
})
