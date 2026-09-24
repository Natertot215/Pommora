// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { undo } from '@codemirror/commands'
import { buildPageIndex } from '@pommora/core/Connections/pageIndex'
import { detail } from '@pommora/core/Testing/fixtures'
import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
import { testHost } from '../MarkdownPM/editorHarness'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { cachePageDetail, clearCache } from '../Session/pageDetailCache'
import { flushPageSave } from '../Session/saveScheduler'
import { stubDialer } from '../vitest.setup'
import { useBodyMount } from './bodyMount'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PATH = 'Notes/B.md'
let disk: string
let root: Root
let container: HTMLDivElement
let views: Record<string, EditorView>
let changes: Record<string, number>
let renames: string[]

const connections: ConnectionsApi = {
  ...buildPageIndex([
    { id: '1', title: 'Alpha', path: 'Notes/Alpha.md' },
    { id: '2', title: 'Beta', path: 'Notes/Beta.md' },
    { id: '3', title: 'B', path: PATH },
  ]),
  open: () => {},
}

// One editor of the page, seated as PageView and PageTile seat theirs.
function Mount({ name, seed }: { name: string; seed: string }): React.JSX.Element {
  const seat = useBodyMount(PATH)
  return createElement(MarkdownEditor, {
    initialBody: seed,
    host: testHost({ pageTitle: 'B', settings: { inPageHeadingResolution: 'automatic' } }),
    connections,
    onChange: (body: string) => {
      changes[name] = (changes[name] ?? 0) + 1
      seat.save(body)
    },
    register: (view: EditorView | null) => {
      if (view) views[name] = view
      seat.register(view)
    },
    onHeadingRename: (from: string, to: string) => renames.push(`${name}:${from}->${to}`),
  })
}

async function mountTwo(seed: string, known = seed): Promise<{ a: EditorView; b: EditorView }> {
  cachePageDetail(detail({ path: PATH, body: known }))
  disk = known
  await act(async () =>
    root.render([
      createElement(Mount, { key: 'a', name: 'a', seed }),
      createElement(Mount, { key: 'b', name: 'b', seed }),
    ]),
  )
  return { a: views.a, b: views.b }
}

const type = (view: EditorView, at: number, text: string): void =>
  view.dispatch({
    changes: { from: at, insert: text },
    selection: EditorSelection.cursor(at + text.length),
    userEvent: 'input.type',
  })

const flush = (): Promise<void> => act(() => flushPageSave(PATH))

beforeEach(() => {
  clearCache()
  views = {}
  changes = {}
  renames = []
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'page:updateBody': vi.fn(async (_p: string, body: string) => {
      disk = body
      return { ok: true, value: { hash: `h:${body}`, stale: false } }
    }),
    'sync:captureLocal': vi.fn(async () => ({ ok: true, value: null })),
    'index:headings': async () => ({ ok: true, value: {} }),
    'connections:headingRenamed': async () => ({ ok: true, value: { touched: [] } }),
    'page:open': async () => ({
      ok: true,
      value: detail({ path: 'Notes/Alpha.md', body: 'inner' }),
    }),
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  clearCache()
})

describe('one head per page path', () => {
  it('a mount that did not type follows the saved body, so its later typing keeps the other’s', async () => {
    const { a, b } = await mountTwo('B')
    type(a, 1, 'x')
    await flush()
    expect(b.state.doc.toString()).toBe('Bx')
    type(b, 2, 'y')
    await flush()
    expect(disk).toBe('Bxy')
  })

  it('typing before the other mount’s save lands merges onto it rather than over it', async () => {
    const { a, b } = await mountTwo('B')
    type(a, 1, 'x')
    type(b, 0, 'y')
    type(b, 1, 'z')
    await flush()
    expect(disk).toBe('yzBx')
    expect(a.state.doc.toString()).toBe('yzBx')
    expect(b.state.doc.toString()).toBe('yzBx')
  })

  it('a mount seeded behind the known body follows it on arrival', async () => {
    const { a } = await mountTwo('B', 'Bnewer')
    expect(a.state.doc.toString()).toBe('Bnewer')
  })

  it('a followed body stays out of the follower’s undo history and never echoes back', async () => {
    const { a, b } = await mountTwo('B')
    type(b, 1, 'z')
    await flush()
    const typed = changes.b
    type(a, 2, 'x')
    await flush()
    expect(b.state.doc.toString()).toBe('Bzx')
    expect(changes.b).toBe(typed)
    undo(b)
    expect(b.state.doc.toString()).toBe('Bx')
  })

  it('a follow passes the guards: a deleted embed line stays deleted in the other mount', async () => {
    const { a, b } = await mountTwo('x\n![[Alpha]]\n![[Beta]]\ny\n')
    a.dispatch({ changes: { from: 2, to: 2 + '![[Alpha]]\n'.length }, userEvent: 'delete' })
    await flush()
    expect(b.state.doc.toString()).toBe('x\n![[Beta]]\ny\n')
    type(b, b.state.doc.length, 'z')
    await flush()
    expect(disk).toBe('x\n![[Beta]]\ny\nz')
  })

  it('a followed heading edit renames nothing from the follower', async () => {
    const { a, b } = await mountTwo('## Foo\n\nsee [[#Foo]]\n')
    b.dispatch({ selection: EditorSelection.cursor(b.state.doc.length) })
    type(a, 6, 'b')
    await flush()
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(b.state.doc.toString().startsWith('## Foob\n')).toBe(true)
    expect(renames.filter((r) => r.startsWith('b:'))).toEqual([])
  })
})
