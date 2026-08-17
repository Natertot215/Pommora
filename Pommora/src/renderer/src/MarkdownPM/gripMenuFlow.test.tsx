// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'
import { useSession } from '@renderer/store'
import type { GripMenuAction, GripMenuContext } from '@shared/gripMenu'
import type { NexusTree } from '@shared/types'

const calls: GripMenuContext[] = []
let nextPick: GripMenuAction | null = null
stubEditorBridge({
  gripMenu: async (ctx: GripMenuContext) => {
    calls.push(ctx)
    return nextPick
  },
  setGripHot: () => {},
})

const pages = [
  { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
  { id: 'p2', title: 'Beta', path: 'Notes/Beta.md' },
  { id: 'p3', title: 'Soup', path: 'Notes/Soup.md' },
]

// nexus + personalization are non-optional on a real tree — treeIndex's walk dereferences both,
// and the tiles' lazy chunk resolves against this store tree after the mounting test has ended.
const treeOf = (collectionPages: { id: string; title: string; path: string }[]): NexusTree =>
  ({
    nexus: { name: 'Test' },
    personalization: {},
    collections: [
      { id: 'c1', title: 'Notes', path: 'Notes', sets: [], pages: collectionPages, views: [] },
    ],
  }) as unknown as NexusTree

const conn: ConnectionsApi = { ...buildPageIndex(pages), open: () => {} }

beforeEach(() => {
  calls.length = 0
  useSession.setState({ tree: treeOf(pages) })
})
afterEach(cleanupEditor)

const mount = (initialBody: string): Promise<EditorView> =>
  mountEditor({ initialBody, connections: conn, embedAncestors: ['Notes/EmbedHost.md'] })

/** Every page title the menu offered, at any depth of the pick tree. */
const offeredTitles = (): string[] => {
  const out: string[] = []
  const walk = (n: { title?: string; children?: unknown[] }): void => {
    if (n.title) out.push(n.title)
    for (const ch of n.children ?? []) walk(ch as { title?: string })
  }
  const ctx = calls[0]
  if (ctx.kind === 'embed') for (const n of ctx.tree) walk(n)
  return out
}

/** Right-click a line's gutter strip — jsdom rects are all zero, so clientX −1 clears the hit-test.
 *  A claimed line's raw text is replaced by its widget, so 'tile' finds the line hosting one. */
async function gripMenu(view: EditorView, lineText: string): Promise<void> {
  const line = [...view.dom.querySelectorAll('.cm-line')].find((l) =>
    lineText === 'tile'
      ? l.querySelector('.mdpm-embed-tile') !== null
      : (l.textContent ?? '').includes(lineText),
  )
  if (!line) throw new Error(`no line: ${lineText}`)
  await act(async () => {
    line.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: -1 }),
    )
    await Promise.resolve()
  })
}

describe("a list grip's Type switch", () => {
  it("offers the block's current kind, and switching rewrites every marker", async () => {
    const view = await mount('- alpha\n- beta')
    nextPick = { action: 'listKind', kind: 'ordered' }
    await gripMenu(view, 'alpha')
    expect(calls[0]).toEqual({ kind: 'list', current: 'bullet' })
    expect(view.state.doc.toString()).toBe('1. alpha\n2. beta')
  })

  it('nested runs number independently of their parent', async () => {
    const view = await mount('- a\n\t- x\n\t- y\n- b')
    nextPick = { action: 'listKind', kind: 'ordered' }
    await gripMenu(view, 'a')
    expect(view.state.doc.toString()).toBe('1. a\n\t1. x\n\t2. y\n2. b')
  })

  it('Checklist and Arrowed reach every level of the block', async () => {
    const view = await mount('1. alpha\n\t2. sub\n\nafter')
    nextPick = { action: 'listKind', kind: 'checkbox' }
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('- [ ] alpha\n\t- [ ] sub\n\nafter')
    nextPick = { action: 'listKind', kind: 'arrow' }
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('→ alpha\n\t→ sub\n\nafter')
  })

  it('a wrapped item keeps its continuation line', async () => {
    const view = await mount('- alpha\n  wrapped body\n- beta')
    nextPick = { action: 'listKind', kind: 'checkbox' }
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('- [ ] alpha\n  wrapped body\n- [ ] beta')
  })

  it('a block whose markers disagree reports no current kind', async () => {
    const view = await mount('- alpha\n1. beta')
    nextPick = null
    await gripMenu(view, 'alpha')
    expect(calls[0]).toEqual({ kind: 'list', current: null })
  })

  it('Delete takes the whole list', async () => {
    const view = await mount('intro\n\n- alpha\n- beta\n\nafter')
    nextPick = { action: 'delete' }
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('intro\n\nafter')
  })
})

describe('the embed tile grip', () => {
  it('offers tile mode, and Page Source re-aims the line', async () => {
    const view = await mount('intro\n\n![[Alpha]]\n\nbelow')
    nextPick = { action: 'source', title: 'Beta' }
    await gripMenu(view, 'tile')
    expect(calls[0]?.kind).toBe('embed')
    expect(offeredTitles()).toEqual(['Beta', 'Soup']) // Alpha embedded, EmbedHost is the host
    expect(view.state.doc.toString()).toBe('intro\n\n![[Beta]]\n\nbelow')
  })

  it('Delete removes the tile with its extra fencing blank', async () => {
    const view = await mount('intro\n\n![[Alpha]]\n\nbelow')
    nextPick = { action: 'delete' }
    await gripMenu(view, 'tile')
    expect(view.state.doc.toString()).toBe('intro\n\nbelow')
  })

  it('Page Source re-aims an UNRESOLVED embed line — the stale token is exactly what needs re-aiming', async () => {
    const view = await mount('intro\n\n![[Ghost]]\n\nbelow')
    nextPick = { action: 'source', title: 'Beta' }
    await gripMenu(view, 'Ghost')
    expect(calls[0]?.kind).toBe('embed')
    expect(view.state.doc.toString()).toBe('intro\n\n![[Beta]]\n\nbelow')
  })

  it('a bracket-bearing title is never offered — the syntax cannot express it', async () => {
    useSession.setState({
      tree: treeOf([
        { id: 'p9', title: 'Notes [Draft]', path: 'Notes/Notes [Draft].md' },
        { id: 'p3', title: 'Soup', path: 'Notes/Soup.md' },
      ]),
    })
    const view = await mount('intro\n\n![[Alpha]]\n\nbelow')
    nextPick = null
    await gripMenu(view, 'tile')
    expect(offeredTitles()).toEqual(['Soup'])
  })
})

describe('every other grip', () => {
  it('a paragraph offers Delete alone', async () => {
    const view = await mount('intro\n\nmiddle para\n\nafter')
    nextPick = { action: 'delete' }
    await gripMenu(view, 'middle para')
    expect(calls[0]).toEqual({ kind: 'plain' })
    expect(view.state.doc.toString()).toBe('intro\n\nafter')
  })

  it('a callout grip deletes the whole box, leaving no doubled blank', async () => {
    const view = await mount('intro\n\n> [!note] head\n> body\n\nafter')
    nextPick = { action: 'delete' }
    await gripMenu(view, 'head')
    expect(calls[0]).toEqual({ kind: 'plain' })
    expect(view.state.doc.toString()).toBe('intro\n\nafter')
  })

  it('a dismissed menu changes nothing', async () => {
    const doc = 'intro\n\n- alpha\n\nafter'
    const view = await mount(doc)
    nextPick = null
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe(doc)
  })

  it('the right-press is defaulted away, so the browser never seats the caret on the grip', async () => {
    const view = await mount('intro\n\n- alpha\n\nafter')
    const line = [...view.dom.querySelectorAll('.cm-line')].find((l) =>
      (l.textContent ?? '').includes('alpha'),
    )!
    const e = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: -1,
    })
    line.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })

  it('acting on a grip takes no focus for the editor', async () => {
    const view = await mount('intro\n\n- alpha\n\nafter')
    nextPick = { action: 'listKind', kind: 'ordered' }
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('intro\n\n1. alpha\n\nafter')
    expect(view.hasFocus).toBe(false)
  })

  it('a read-only editor pops no grip menu at all', async () => {
    const view = await mountEditor({
      initialBody: 'some prose',
      connections: conn,
      readOnly: true,
    })
    await gripMenu(view, 'some prose')
    expect(calls).toHaveLength(0)
  })
})
