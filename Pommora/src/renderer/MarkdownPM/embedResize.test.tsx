// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EditorView } from '@codemirror/view'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { embedField, setEmbedHeights } from '@renderer/MarkdownPM/Editor/embedWidget'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/Testing/editorHarness'
import { firePointer, stubPointerCapture, stubRect } from '@renderer/Testing/pointerHarness'

stubEditorBridge()
stubPointerCapture()
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

/** PageTile loads through React.lazy, so a fresh tile holds only the Suspense frame — its body and
 *  the resize strip enter the DOM together, once that chunk lands. Every assertion reads the tile. */
async function until(cond: () => boolean): Promise<boolean> {
  const deadline = Date.now() + 2000
  while (!cond() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 5))
  return cond()
}

async function mount(props: Parameters<typeof mountEditor>[0]): Promise<EditorView> {
  const view = await mountEditor(props)
  await until(() => view.dom.querySelector('.tile-chassis-body') !== null)
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
    expect(view.dom.querySelector('.resize-edge-s')).not.toBeNull()
    const bare = await mount({ initialBody: '![[Alpha]]', connections: conn })
    expect(bare.dom.querySelector('.resize-edge-s')).toBeNull()
  })

  it('a drag on the handle sizes the tile from its measured height and persists one integer', async () => {
    const save = vi.fn()
    const view = await mount({ ...hosted, embedHeights: { load: async () => ({}), save } })
    const span = view.dom.querySelector('.mdpm-embed-tile') as HTMLElement
    stubRect(span, { top: 0, bottom: 480.4 })
    const handle = span.querySelector('.resize-edge-s') as HTMLElement
    firePointer(handle, 'pointerdown', { x: 0, y: 0 })
    firePointer(window, 'pointermove', { x: 0, y: 40 })
    expect(span.style.height).toBe('520px')
    expect(handle.parentElement).toBe(span)
    expect(await until(() => handle.classList.contains('is-active'))).toBe(true)
    firePointer(window, 'pointerup')
    expect(await until(() => !handle.classList.contains('is-active'))).toBe(true)
    expect(span.style.height).toBe('520px')
    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith({ p1: 520 })
  })
})
