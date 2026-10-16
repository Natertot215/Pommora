// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { encodeLinkTarget } from '../../Connections/links'
import { autocompleteQuery, commitEdit } from '../Autocomplete/autocomplete'
import { activeTokenIndices, tokenize } from '../Engine/tokens'
import type { ConnectionsApi } from './connectionsApi'
import { readLinkText, resolveLink } from '../../Connections/linkValue'
import { buildPageIndex, type ConnPage } from '../../Connections/pageIndex'
import { renderCellContent } from '../Tables/cellStatic'
import { cleanupEditor, mountEditor, seedHost, stubEditorBridge } from '../../Testing/editorHarness'
import { scanDoc } from '../Engine/docScan'

const opened = vi.fn()
const openExternal = vi.fn()
stubEditorBridge()
seedHost({ openLink: openExternal })

const conn: ConnectionsApi = {
  index: buildPageIndex([
    { id: 'p1', title: 'Work Notes', path: 'Notes/Work Notes.md' },
    { id: 'p2', title: 'Node.js', path: 'Notes/Node.js.md' },
  ]),
  headingsOf: () => undefined,
  open: (p: ConnPage) => opened(p.id),
}

let cellRoot: Root | null = null
let cellHost: HTMLDivElement | null = null

async function renderCell(text: string): Promise<HTMLDivElement> {
  cellHost = document.createElement('div')
  document.body.appendChild(cellHost)
  cellRoot = createRoot(cellHost)
  await act(async () => cellRoot?.render(renderCellContent(text, () => conn)))
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
  const resolved = (dest: string) => resolveLink(readLinkText(`[x](${dest})`), conn.index)

  it('carries a heading fragment, and reads a bare fragment as the page itself', () => {
    const t = resolved('Work%20Notes#Setup')
    expect(t.kind === 'page' && t.page.id).toBe('p1')
    expect(t.kind === 'page' && t.heading).toBe('Setup')
    expect(resolved('#Setup')).toEqual({ kind: 'self', heading: 'Setup' })
  })

  it('reads an encoded page title as that page', () => {
    const t = resolved(encodeLinkTarget('Work Notes'))
    expect(t.kind === 'page' && t.page.id).toBe('p1')
  })

  // isValidLink accepts any dotted host, so resolution runs first or a page called Node.js becomes unreachable through this syntax.
  it('a dotted title beats the URL gate', () => {
    const t = resolved('Node.js')
    expect(t.kind === 'page' && t.page.id).toBe('p2')
  })

  it('a real URL stays external, and a page by its last path segment does not exist', () => {
    expect(resolved('https://example.com').kind).toBe('url')
    expect(resolved('https://example.com/Work%20Notes').kind).toBe('url')
  })

  it('neither a page nor a URL is unresolved, exactly as before', () => {
    expect(resolved('not a url')).toEqual({ kind: 'unresolved', status: 'phantom' })
  })

  // A fragment is the heading's own text, so a separator inside it doesn't make the target an address.
  it('a heading holding a slash is still a heading', () => {
    const t = resolved('Work%20Notes#A/B')
    expect(t.kind === 'page' && t.heading).toBe('A/B')
  })
})

// A link colored as a connection in the body and as broken in a cell is one link with two truths.
describe('both syntaxes and both renderers agree', () => {
  const target = encodeLinkTarget('Work Notes')

  it('the cell renderer reads an alias over a heading, and reads it missing as the editor does', async () => {
    const missing = {
      ...conn,
      headingsOf: () => ({
        keys: ['setup'],
        texts: ['Setup'],
        outline: [{ text: 'Setup', level: 2 }],
      }),
    }
    cellHost = document.createElement('div')
    document.body.appendChild(cellHost)
    cellRoot = createRoot(cellHost)
    await act(async () =>
      cellRoot?.render(
        renderCellContent('[[Work Notes#Gone\\|al]] [lab](Work%20Notes#Gone)', () => missing),
      ),
    )
    const shown = [...cellHost.querySelectorAll('.md-connection-heading-missing')]
    expect(shown.map((e) => e.textContent)).toEqual(['al', 'lab'])
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

  it('the editor marks the link the caret is in as open', async () => {
    const view = await mountEditor({
      initialBody: `see [the notes](${target}) end`,
      connections: conn,
    })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 6 } })
    })
    expect(view.dom.querySelector('.md-connection-open')?.textContent).toBe('the notes')
  })
})

describe('an unresolved markdown link looks as an unresolved connection does', () => {
  const dups: ConnectionsApi = {
    index: buildPageIndex([
      { id: 'd1', title: 'Dup', path: 'A/Dup.md' },
      { id: 'd2', title: 'Dup', path: 'B/Dup.md' },
      { id: 'd3', title: 'dup.io', path: 'A/dup.io.md' },
      { id: 'd4', title: 'dup.io', path: 'B/dup.io.md' },
    ]),
    headingsOf: () => undefined,
    open: () => {},
  }
  const drawn = async (body: string): Promise<{ editor: string[]; cell: string[] }> => {
    const view = await mountEditor({ initialBody: body, connections: dups })
    cellHost = document.createElement('div')
    document.body.appendChild(cellHost)
    cellRoot = createRoot(cellHost)
    await act(async () => cellRoot?.render(renderCellContent(body, () => dups)))
    const label = (root: Element): string[] => {
      const el = [...root.querySelectorAll('span')].find((s) => s.textContent === 'x')
      return el ? [...el.classList] : []
    }
    return { editor: label(view.dom), cell: label(cellHost) }
  }

  it('a title two pages share draws ambiguous, as [[Dup]] does', async () => {
    const { editor, cell } = await drawn('a [x](Dup) b')
    expect(editor).toContain('md-connection-ambiguous')
    expect(cell).toContain('md-connection-ambiguous')
  })

  it('revealed, its glyph reports the ambiguity as a connection glyph does', async () => {
    const view = await mountEditor({ initialBody: 'a [x](Dup) b', connections: dups })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 3 } })
    })
    expect(view.dom.querySelector('.md-connection-glyph-ambiguous')).not.toBeNull()
    expect(view.dom.querySelector('.md-connection-glyph-resolved')).toBeNull()
  })

  it('an ambiguous title is never an address, though it reads as one', async () => {
    expect(resolveLink(readLinkText('[x](dup.io)'), dups.index)).toEqual({
      kind: 'unresolved',
      status: 'ambiguous',
    })
    const { editor, cell } = await drawn('a [x](dup.io) b')
    expect(editor).toContain('md-connection-ambiguous')
    expect(cell).toContain('md-connection-ambiguous')
  })

  it('a title no page has draws phantom, with no broken-link class of its own', async () => {
    const { editor, cell } = await drawn('a [x](Missing) b')
    expect(editor).toEqual(['md-connection-phantom'])
    expect(cell).toContain('md-connection-phantom')
    expect(resolveLink(readLinkText('[x](Missing.md)'), dups.index)).toEqual({
      kind: 'unresolved',
      status: 'phantom',
    })
  })

  it('an ambiguous title revealed by the caret reads as a page destination, never as an address', async () => {
    const view = await mountEditor({ initialBody: 'a [x](Dup) b', connections: dups })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 5 } })
    })
    expect(view.dom.querySelector('.md-connection-target')?.textContent).toContain('Dup')
    expect(view.dom.querySelector('.md-link-url')).toBeNull()
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

// Asserted on the edit rather than by driving the panel: opening it needs coordsAtPos, and jsdom measures nothing, so a panel-driven version would only ever test the harness.
describe('picking a page inside the parens', () => {
  const applied = (doc: string, caret: number): { text: string; after: string } => {
    const ac = autocompleteQuery(scanDoc(doc), caret)!
    expect(ac.form).toBe('target')
    const edit = commitEdit(ac, 'Work Notes', { container: null, keepTitle: false })
    let text = doc
    for (const c of [...edit.changes].reverse()) {
      text = text.slice(0, c.from) + c.insert + text.slice(c.to)
    }
    return { text, after: text.slice(edit.anchor) }
  }

  // A markdown link renders as its label alone, so selecting it read as though the whole thing were selected; it rests past the closer instead, where finishing a connection leaves you.
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

describe('a connection takes its color as it is typed', () => {
  it('an unresolved connection being typed wears the connection color', async () => {
    const view = await mountEditor({ initialBody: 'see [[Wo]] end', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ changes: { from: 8, insert: 'r' }, selection: { anchor: 9 } })
    })
    expect(view.dom.querySelector('.md-connection-typing')?.textContent).toBe('Wor')
  })

  // Clicking into a link that names no page is inspecting an unresolved link. Only writing one earns the color.
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

// The body did not raise a glance for a page-naming markdown link, because the connection handler's hit-test reads wikiLink tokens and this is a `link`. The dwell is the seam's, so the hook fires on the pointerover.
describe('an internal markdown link glances like a connection', () => {
  it('arms the page glance on the drawn link', async () => {
    const glance = vi.fn()
    const view = await mountEditor({
      initialBody: `see [the notes](${encodeLinkTarget('Work Notes')}) end`,
      connections: conn,
      host: { glance: { arm: glance, cancel: () => {}, close: () => {}, contains: () => false } },
    })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(6)
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    span.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(glance).toHaveBeenCalledWith(
      { kind: 'page', id: 'p1', path: 'Notes/Work Notes.md' },
      span,
    )
  })
})

// An empty alias offers its page's names outright — the rule is the shape on the line, not the gesture that produced it.
describe('an alias reveals what it hides', () => {
  const openAt = async (body: string, caret: number) => {
    const view = await mountEditor({ initialBody: body, connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: caret } })
    })
    return view
  }

  it('marks the target and introduces it with the link glyph', async () => {
    const view = await openAt('see [[Work Notes|the plan]] end', 20)
    expect(view.dom.querySelector('.md-connection-target')?.textContent).toBe('Work Notes')
    expect(view.dom.querySelector('.md-connection-glyph')).not.toBeNull()
  })

  it('the glyph reports that the target resolves', async () => {
    const view = await openAt('see [[Work Notes|the plan]] end', 20)
    expect(view.dom.querySelector('.md-connection-glyph-resolved')).not.toBeNull()
  })

  // Following the PIPE, not the resolution: an alias for a page that doesn't exist yet is still a link.
  it('and appears for a target that resolves to nothing, unresolved', async () => {
    const view = await openAt('see [[No Such Page|the plan]] end', 22)
    expect(view.dom.querySelector('.md-connection-target')?.textContent).toBe('No Such Page')
    expect(view.dom.querySelector('.md-connection-glyph')).not.toBeNull()
    expect(view.dom.querySelector('.md-connection-glyph-resolved')).toBeNull()
  })

  it('and marks nothing while the link is closed', async () => {
    const view = await openAt('see [[Work Notes|the plan]] end', 0)
    expect(view.dom.querySelector('.md-connection-target')).toBeNull()
    expect(view.dom.querySelector('.md-connection-glyph')).toBeNull()
  })

  it('a link wearing no pipe keeps its title tinted, and still wears the glyph', async () => {
    const view = await openAt('see [[Work Notes]] end', 10)
    expect(view.dom.querySelector('.md-connection-target')).toBeNull()
    expect(view.dom.querySelector('.md-connection-glyph-resolved')).not.toBeNull()
    expect(view.dom.querySelector('.md-connection-resolved')?.textContent).toBe('Work Notes')
  })

  it('and one that names nothing gets neither', async () => {
    const view = await openAt('see [[No Such Page]] end', 10)
    expect(view.dom.querySelector('.md-connection-glyph')).toBeNull()
  })

  it('an internal markdown link’s target wears the glyph, an external one the URL treatment', async () => {
    const internal = await openAt(`see [x](${encodeLinkTarget('Work Notes')}) end`, 12)
    expect(internal.dom.querySelector('.md-connection-glyph-resolved')).not.toBeNull()
    expect(internal.dom.querySelector('.md-connection-target')).not.toBeNull()
    expect(internal.dom.querySelector('.md-link-url')).toBeNull()
    await cleanupEditor()

    const external = await openAt('see [x](https://example.com) end', 12)
    expect(external.dom.querySelector('.md-link-url')).not.toBeNull()
    expect(external.dom.querySelector('.md-connection-glyph')).toBeNull()
  })

  it('but a pipe opened and not yet written already shows both', async () => {
    const view = await openAt('see [[Work Notes|]] end', 17)
    expect(view.dom.querySelector('.md-connection-target')?.textContent).toBe('Work Notes')
    expect(view.dom.querySelector('.md-connection-glyph-resolved')).not.toBeNull()
  })
})

// Both gates are pinned to the one exported class constant, so the decorator and the arming selector cannot drift.
describe('a website link previews live', () => {
  it('arms the website glance on the drawn link, never the page one', async () => {
    const glance = vi.fn()
    const view = await mountEditor({
      initialBody: 'see [GitHub](https://github.com) end',
      connections: conn,
      host: { glance: { arm: glance, cancel: () => {}, close: () => {}, contains: () => false } },
    })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(6)
    const span = view.dom.querySelector('.md-link') as HTMLElement
    span.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(glance).toHaveBeenCalledTimes(1)
    expect(glance).toHaveBeenCalledWith({ kind: 'url', url: 'https://github.com' }, span)
  })
})
