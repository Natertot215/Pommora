// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { embedField, setEmbedHeights } from '@renderer/MarkdownPM/editor/embedWidget'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const saves: Record<string, number>[] = []
const heightsApi = {
  load: async () => ({ p1: 480 }),
  save: (h: Record<string, number>) => {
    saves.push(h)
  },
}

async function mount(): Promise<EditorView> {
  return mountEditor({
    initialBody: 'intro\n\n![[Alpha]]\n\nbelow',
    connections: conn,
    embedHeights: heightsApi,
  })
}

describe('persisted tile heights', () => {
  it('the mount load lands the height on the tile and its estimate', async () => {
    const view = await mount()
    await new Promise((r) => setTimeout(r, 10))
    expect(view.state.field(embedField).heights).toEqual({ p1: 480 })
    const span = view.dom.querySelector('.mdpm-embed-tile') as HTMLElement
    expect(span.style.height).toBe('480px')
  })

  it('a heights effect re-renders in place; an unknown target keeps the KNOB default', async () => {
    const view = await mount()
    await new Promise((r) => setTimeout(r, 10))
    view.dispatch({ effects: setEmbedHeights.of({ other: 200 }) })
    const span = view.dom.querySelector('.mdpm-embed-tile') as HTMLElement
    expect(span.style.height).toBe('')
  })

  it('the resize handle renders only where heights can persist', async () => {
    const view = await mount()
    await new Promise((r) => setTimeout(r, 10))
    expect(view.dom.querySelector('.mdpm-embed-resize')).not.toBeNull()
    const bare = await mountEditor({ initialBody: '![[Alpha]]', connections: conn })
    await new Promise((r) => setTimeout(r, 10))
    expect(bare.dom.querySelector('.mdpm-embed-resize')).toBeNull()
  })
})
