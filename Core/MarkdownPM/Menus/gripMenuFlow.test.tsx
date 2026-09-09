// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '@pommora/core/Connections/pageIndex'
import { cleanupEditor, mountEditor, seedHost, stubEditorBridge } from '../editorHarness'
import { type GripMenuAction, type PickNode, gripMenuItems } from '@pommora/core/Actions/gripMenu'
import type { ActionItem } from '@pommora/core/Actions/menuModel'

const calls: (readonly ActionItem<string>[])[] = []
let nextPick: GripMenuAction | null = null
stubEditorBridge()

const pages = [
  { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
  { id: 'p2', title: 'Beta', path: 'Notes/Beta.md' },
  { id: 'p3', title: 'Soup', path: 'Notes/Soup.md' },
]

const treeOf = (collectionPages: { title: string }[]): PickNode[] => [
  { label: 'Notes', children: collectionPages.map((p) => ({ label: p.title, title: p.title })) },
]

const conn: ConnectionsApi = { ...buildPageIndex(pages), open: () => {} }

const seed = (collectionPages: { title: string }[]): void =>
  seedHost({
    pickTree: treeOf(collectionPages),
    menus: {
      grip: async (ctx) => {
        calls.push(gripMenuItems(ctx))
        return nextPick
      },
    },
  })

beforeEach(() => {
  calls.length = 0
  seed(pages)
})
afterEach(cleanupEditor)

const mount = (initialBody: string): Promise<EditorView> =>
  mountEditor({ initialBody, connections: conn, embedAncestors: ['Notes/EmbedHost.md'] })

const offeredTitles = (): string[] => {
  const out: string[] = []
  const walk = (rows: readonly ActionItem<string>[]): void => {
    for (const r of rows) {
      if (r.submenu) walk(r.submenu)
      else if (r.action.startsWith('source:')) out.push(r.action.slice('source:'.length))
    }
  }
  walk(calls[0] ?? [])
  return out
}

/** Right-click a line's gutter strip — jsdom rects are all zero, so clientX −1 clears the hit-test. */
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
    nextPick = 'listKind:ordered'
    await gripMenu(view, 'alpha')
    expect(calls[0]).toEqual(gripMenuItems({ kind: 'list', current: 'bullet' }))
    expect(view.state.doc.toString()).toBe('1. alpha\n2. beta')
  })

  it('nested runs number independently of their parent', async () => {
    const view = await mount('- a\n\t- x\n\t- y\n- b')
    nextPick = 'listKind:ordered'
    await gripMenu(view, 'a')
    expect(view.state.doc.toString()).toBe('1. a\n\t1. x\n\t2. y\n2. b')
  })

  it('Checklist and Arrowed reach every level of the block', async () => {
    const view = await mount('1. alpha\n\t2. sub\n\nafter')
    nextPick = 'listKind:checkbox'
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('- [ ] alpha\n\t- [ ] sub\n\nafter')
    nextPick = 'listKind:arrow'
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('→ alpha\n\t→ sub\n\nafter')
  })

  it('a wrapped item keeps its continuation line', async () => {
    const view = await mount('- alpha\n  wrapped body\n- beta')
    nextPick = 'listKind:checkbox'
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('- [ ] alpha\n  wrapped body\n- [ ] beta')
  })

  it('a block whose markers disagree reports no current kind', async () => {
    const view = await mount('- alpha\n1. beta')
    nextPick = null
    await gripMenu(view, 'alpha')
    expect(calls[0]).toEqual(gripMenuItems({ kind: 'list', current: null }))
  })

  it('Delete takes the whole list', async () => {
    const view = await mount('intro\n\n- alpha\n- beta\n\nafter')
    nextPick = 'delete'
    await gripMenu(view, 'alpha')
    expect(view.state.doc.toString()).toBe('intro\n\nafter')
  })
})

describe('a document that moves while the menu is open', () => {
  it('declines rather than acting on whatever now sits at the span', async () => {
    const view = await mount('- alpha\n- beta\n\ntail paragraph')
    nextPick = 'delete'
    const line = [...view.dom.querySelectorAll('.cm-line')].find((l) =>
      (l.textContent ?? '').includes('tail'),
    )!
    await act(async () => {
      line.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: -1 }),
      )
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '- a' } })
      await Promise.resolve()
    })
    expect(view.state.doc.toString()).toBe('- a')
  })
})

describe('the embed tile grip', () => {
  it('offers tile mode, and Source re-aims the line', async () => {
    const view = await mount('intro\n\n![[Alpha]]\n\nbelow')
    nextPick = 'source:Beta'
    await gripMenu(view, 'tile')
    expect(calls[0]?.[0].label).toBe('Source')
    expect(offeredTitles()).toEqual(['Beta', 'Soup'])
    expect(view.state.doc.toString()).toBe('intro\n\n![[Beta]]\n\nbelow')
  })

  it('Delete removes the tile with its extra fencing blank', async () => {
    const view = await mount('intro\n\n![[Alpha]]\n\nbelow')
    nextPick = 'delete'
    await gripMenu(view, 'tile')
    expect(view.state.doc.toString()).toBe('intro\n\nbelow')
  })

  it('Source re-aims an UNRESOLVED embed line — the stale token is exactly what needs re-aiming', async () => {
    const view = await mount('intro\n\n![[Ghost]]\n\nbelow')
    nextPick = 'source:Beta'
    await gripMenu(view, 'Ghost')
    expect(calls[0]?.[0].label).toBe('Source')
    expect(view.state.doc.toString()).toBe('intro\n\n![[Beta]]\n\nbelow')
  })

  it('a bracket-bearing title is never offered — the syntax cannot express it', async () => {
    seed([{ title: 'Notes [Draft]' }, { title: 'Soup' }])
    const view = await mount('intro\n\n![[Alpha]]\n\nbelow')
    nextPick = null
    await gripMenu(view, 'tile')
    expect(offeredTitles()).toEqual(['Soup'])
  })
})

describe('every other grip', () => {
  it('a paragraph offers Delete alone', async () => {
    const view = await mount('intro\n\nmiddle para\n\nafter')
    nextPick = 'delete'
    await gripMenu(view, 'middle para')
    expect(calls[0]).toEqual(gripMenuItems({ kind: 'plain' }))
    expect(view.state.doc.toString()).toBe('intro\n\nafter')
  })

  it('a callout grip deletes the whole box, leaving no doubled blank', async () => {
    const view = await mount('intro\n\n> [!note] head\n> body\n\nafter')
    nextPick = 'delete'
    await gripMenu(view, 'head')
    expect(calls[0]).toEqual(gripMenuItems({ kind: 'plain' }))
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
    nextPick = 'listKind:ordered'
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

describe("a webpage tile's Edit Link", () => {
  const URL = 'https://example.com/one'
  const LINE = `![](${URL})`

  it('seats the selection on the address in the line, un-forming the tile until it leaves', async () => {
    const view = await mount(`intro\n${LINE}`)
    expect(view.dom.querySelector('.mdpm-embed-tile')).not.toBeNull()

    nextPick = 'editLink'
    await gripMenu(view, 'tile')

    const at = view.state.doc.line(2).from
    expect(view.state.selection.main.from).toBe(at + LINE.indexOf(URL))
    expect(view.state.selection.main.to).toBe(at + LINE.indexOf(URL) + URL.length)
    expect(view.dom.querySelector('.mdpm-embed-tile')).toBeNull()
    expect(view.state.doc.toString()).toBe(`intro\n${LINE}`)

    await act(async () => {
      view.dispatch({
        changes: {
          from: view.state.selection.main.from,
          to: view.state.selection.main.to,
          insert: 'https://example.org/two',
        },
      })
      view.dispatch({ selection: { anchor: 0 } })
      await Promise.resolve()
    })
    expect(view.state.doc.toString()).toBe('intro\n![](https://example.org/two)')
    expect(view.dom.querySelector('.mdpm-embed-tile')).not.toBeNull()
  })
})
