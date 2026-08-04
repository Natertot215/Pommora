// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { MarkdownEditor } from '@renderer/MarkdownPM'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { useSession } from '@renderer/store'
import type { EmbedMenuAction, EmbedMenuContext } from '@shared/embedMenu'
import type { NexusTree } from '@shared/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const calls: EmbedMenuContext[] = []
let nextPick: EmbedMenuAction | null = null
;(window as unknown as { nexus: unknown }).nexus = {
  openPage: async () => ({
    ok: true,
    value: { id: 'x', title: 'Alpha', path: 'Notes/Alpha.md', frontmatter: {}, body: 'inner' },
  }),
  embedMenu: async (ctx: EmbedMenuContext) => {
    calls.push(ctx)
    return nextPick
  },
  setGripHot: () => {},
}

const tree = {
  collections: [
    {
      id: 'c1',
      title: 'Notes',
      path: 'Notes',
      sets: [],
      pages: [
        { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
        { id: 'p2', title: 'Beta', path: 'Notes/Beta.md' },
        { id: 'p3', title: 'Soup', path: 'Notes/Soup.md' },
      ],
      views: [],
    },
  ],
} as unknown as NexusTree

const conn: ConnectionsApi = {
  ...buildPageIndex([
    { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
    { id: 'p2', title: 'Beta', path: 'Notes/Beta.md' },
    { id: 'p3', title: 'Soup', path: 'Notes/Soup.md' },
  ]),
  open: () => {},
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  calls.length = 0
  useSession.setState({ tree })
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function mount(body: string): Promise<EditorView> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      createElement(MarkdownEditor, {
        initialBody: body,
        onChange: () => {},
        connections: conn,
        embedAncestors: ['Notes/EmbedHost.md'],
      }),
    )
  })
  const dom = container.querySelector('.cm-editor')
  const v = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!v) throw new Error('no EditorView')
  return v
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
    const titles: string[] = []
    const walk = (n: { title?: string; children?: unknown[] }): void => {
      if (n.title) titles.push(n.title)
      for (const ch of n.children ?? []) walk(ch as { title?: string })
    }
    for (const n of calls[0].tree) walk(n)
    expect(titles).toEqual(['Beta', 'Soup']) // Alpha embedded, EmbedHost is the host
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
