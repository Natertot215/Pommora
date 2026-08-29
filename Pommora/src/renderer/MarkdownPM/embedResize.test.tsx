// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { embedField, setEmbedHeights } from '@renderer/MarkdownPM/Editor/embedWidget'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/Testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const hosted = {
  initialBody: 'intro\n\n![[Alpha]]\n\nbelow',
  connections: conn,
  embedHeights: { load: async () => ({ p1: 480 }), save: () => {} },
}

/** PageEmbed loads through React.lazy, so a fresh tile holds only the Suspense frame — its body and
 *  the resize strip enter the DOM together, once that chunk lands. Every assertion reads the tile. */
async function mount(props: Parameters<typeof mountEditor>[0]): Promise<EditorView> {
  const view = await mountEditor(props)
  const deadline = Date.now() + 2000
  while (!view.dom.querySelector('.tile-chassis-body') && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 5))
  return view
}

describe('persisted tile heights', () => {
  it('the mount load lands the height on the tile and its estimate', async () => {
    const view = await mount(hosted)
    expect(view.state.field(embedField).heights).toEqual({ p1: 480 })
    const span = view.dom.querySelector('.mdpm-embed-tile') as HTMLElement
    expect(span.style.height).toBe('480px')
  })

  it('a heights effect re-renders in place; an unknown target keeps the KNOB default', async () => {
    const view = await mount(hosted)
    view.dispatch({ effects: setEmbedHeights.of({ other: 200 }) })
    const span = view.dom.querySelector('.mdpm-embed-tile') as HTMLElement
    expect(span.style.height).toBe('')
  })

  it('the resize handle renders only where heights can persist', async () => {
    const view = await mount(hosted)
    expect(view.dom.querySelector('.mdpm-embed-resize')).not.toBeNull()
    const bare = await mount({ initialBody: '![[Alpha]]', connections: conn })
    expect(bare.dom.querySelector('.mdpm-embed-resize')).toBeNull()
  })
})
