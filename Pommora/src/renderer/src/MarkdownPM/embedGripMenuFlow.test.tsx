// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'
import { useSession } from '@renderer/store'
import type { EmbedMenuAction, EmbedMenuContext } from '@shared/embedMenu'
import type { NexusTree } from '@shared/types'

const calls: EmbedMenuContext[] = []
let nextPick: EmbedMenuAction | null = null
stubEditorBridge({
  embedMenu: async (ctx: EmbedMenuContext) => {
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
  for (const n of calls[0].tree) walk(n)
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

describe('the embed grip menu, end to end', () => {
  it('a rail grip offers create mode with the host + embedded pages excluded, and the pick inserts fenced', async () => {
    const view = await mount('intro prose\n\n![[Alpha]]\n\nbelow')
    nextPick = { action: 'embed', title: 'Soup' }
    await gripMenu(view, 'intro prose')
    expect(calls).toHaveLength(1)
    expect(calls[0].mode).toBe('create')
    expect(offeredTitles()).toEqual(['Beta', 'Soup']) // Alpha embedded, EmbedHost is the host
    expect(view.state.doc.toString()).toBe('intro prose\n\n![[Soup]]\n\n![[Alpha]]\n\nbelow')
  })

  it("an embed tile's grip offers tile mode, and Page Source re-aims the line", async () => {
    const view = await mount('intro\n\n![[Alpha]]\n\nbelow')
    nextPick = { action: 'source', title: 'Beta' }
    await gripMenu(view, 'tile')
    expect(calls[0]?.mode).toBe('tile')
    expect(view.state.doc.toString()).toBe('intro\n\n![[Beta]]\n\nbelow')
  })

  it('Delete Embed removes the tile with its extra fencing blank', async () => {
    const view = await mount('intro\n\n![[Alpha]]\n\nbelow')
    nextPick = { action: 'delete' }
    await gripMenu(view, 'tile')
    expect(view.state.doc.toString()).toBe('intro\n\nbelow')
  })

  it('a dismissed menu changes nothing', async () => {
    const doc = 'intro\n\n![[Alpha]]\n\nbelow'
    const view = await mount(doc)
    nextPick = null
    await gripMenu(view, 'tile')
    expect(view.state.doc.toString()).toBe(doc)
  })
})

describe('the gate folds', () => {
  it('Page Source re-aims an UNRESOLVED embed line — the stale token is exactly what needs re-aiming', async () => {
    const view = await mount('intro\n\n![[Ghost]]\n\nbelow')
    nextPick = { action: 'source', title: 'Beta' }
    await gripMenu(view, 'Ghost')
    expect(calls[0]?.mode).toBe('tile')
    expect(view.state.doc.toString()).toBe('intro\n\n![[Beta]]\n\nbelow')
  })

  it('a bracket-bearing title is never offered — the syntax cannot express it', async () => {
    useSession.setState({
      tree: treeOf([
        { id: 'p9', title: 'Notes [Draft]', path: 'Notes/Notes [Draft].md' },
        { id: 'p3', title: 'Soup', path: 'Notes/Soup.md' },
      ]),
    })
    const view = await mount('intro prose')
    nextPick = null
    await gripMenu(view, 'intro prose')
    expect(offeredTitles()).toEqual(['Soup'])
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
