// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearNotification,
  currentNotification,
} from '@pommora/core/Interface/Notifications/notifications'
import { undoValue } from '@pommora/core/Session/undo'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { stubEditorBridge } from '../Testing/editorHarness'
import { TileHost, zoomStyle } from './TileHost'
import { dropAllTileDocs, isTileRemoving, markTileRemoving, readTileBody } from './tileDocStore'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { tileId } from '../Testing/tileLayouts'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    disconnect(): void {}
  },
)

const doc = {
  layout: {
    bands: ['m', 'p', 'v', 'w'].map((id) => ({ node: { kind: 'tile', id: tileId(id), h: 100 } })),
  },
  tiles: [
    { id: tileId('m'), type: 'markdown' },
    { id: tileId('p'), type: 'page', page_id: 'gone' },
    { id: tileId('v'), type: 'view', views: [{ source_id: 's' }] },
    { id: tileId('w'), type: 'widget' },
  ],
  locked: false,
}

let host: HTMLDivElement
let root: Root
const writeMarkdown = vi.fn(async () => ({ ok: true, value: null }))

beforeEach(() => {
  dropAllTileDocs()
  writeMarkdown.mockClear()
  stubEditorBridge({
    'tiles:changed': () => () => {},
    'tiles:get': async () => ({ ok: true, value: doc }),
    'tiles:save': async () => ({ ok: true, value: { landed: doc } }),
    'tiles:readMarkdown': async () => ({ ok: true, value: { body: 'hello' } }),
    'tiles:writeMarkdown': writeMarkdown,
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  dropAllTileDocs()
})

async function until(cond: () => boolean): Promise<boolean> {
  const deadline = Date.now() + 2000
  while (!cond() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 5))
  return cond()
}

describe('a tile zoom style', () => {
  it('styles every step but 1.0 with the one variable, identity-stable per step', () => {
    expect(zoomStyle(1)).toBeUndefined()
    expect(zoomStyle(0.9)).toEqual({ '--tile-zoom': 0.9 })
    expect(zoomStyle(0.9)).toBe(zoomStyle(0.9))
  })
})

describe('the host over the renderer table', () => {
  it('mounts one surface per known kind and holds space for the rest', async () => {
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    expect(await until(() => host.querySelector('.cm-editor') !== null)).toBe(true)
    expect(host.querySelectorAll('.tile-inert')).toHaveLength(3)
  })

  it('Escape leaves the tile that is being edited', async () => {
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelector('.markdown-tile') !== null)).toBe(true)
    await act(async () => {
      ;(host.querySelector('.markdown-tile') as HTMLElement).click()
    })
    expect(host.querySelector('.tile.is-editing-tile')).not.toBeNull()
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })
    expect(host.querySelector('.tile.is-editing-tile')).toBeNull()
  })

  const press = (el: HTMLElement): void => {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    el.click()
  }

  it('moves the edit to the mount that was clicked', async () => {
    await act(async () =>
      root.render(
        <>
          <TileHost host={{ kind: 'homepage' }} />
          <TileHost host={{ kind: 'homepage' }} />
        </>,
      ),
    )
    expect(await until(() => host.querySelectorAll('.markdown-tile').length === 2)).toBe(true)
    const [first, second] = [...host.querySelectorAll('.markdown-tile')] as HTMLElement[]
    await act(async () => press(first))
    expect(host.querySelectorAll('.tile.is-editing-tile')).toHaveLength(1)
    await act(async () => press(second))
    const editing = [...host.querySelectorAll('.tile.is-editing-tile')]
    expect(editing).toHaveLength(1)
    expect(second.closest('.tile')).toBe(editing[0])
  })

  it("suppresses every mount's flush for a tile a sibling is removing", async () => {
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelector('.cm-editor') !== null)).toBe(true)
    await act(async () => {
      ;(host.querySelector('.markdown-tile') as HTMLElement).click()
    })
    const view = EditorView.findFromDOM(host.querySelector('.cm-editor') as HTMLElement)
    await act(async () => {
      view?.dispatch({ changes: { from: view.state.doc.length, insert: '!' } })
    })
    expect(readTileBody(tileId('m'))).toBe('hello!')
    markTileRemoving(tileId('m'))
    expect(isTileRemoving(tileId('m'))).toBe(true)
    await act(async () => root.render(null))
    expect(writeMarkdown).not.toHaveBeenCalled()
  })

  it('a removed tile comes back on Undo, its text and its place with it', async () => {
    const removed = { entry: { id: tileId('m'), type: 'markdown' }, body: 'hello' }
    const restoreTile = vi.fn(async () => ({ ok: true, value: { landed: doc } }))
    const saves: unknown[] = []
    stubEditorBridge({
      'tiles:changed': () => () => {},
      'tiles:get': async () => ({ ok: true, value: doc }),
      'tiles:save': async (_host: unknown, patch: { layout?: unknown }) => {
        if (patch.layout) saves.push(patch.layout)
        return { ok: true, value: { landed: doc } }
      },
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: 'hello' } }),
      'tiles:removeTile': async () => ({
        ok: true,
        value: { removed, landed: { ...doc, tiles: doc.tiles.slice(1) } },
      }),
      'tiles:restoreTile': restoreTile,
      menu: async () => ({ ok: true, value: 'tile:delete' }),
    })
    useSession.setState((st) => ({
      tree: makeTree(),
      devicePrefs: { ...st.devicePrefs, nativeMenus: true },
      personalization: { ...st.personalization, confirmDeletion: false },
    }))
    clearNotification()
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    await act(async () => {
      ;(host.querySelector('.tile-handle') as HTMLElement).click()
    })
    expect(await until(() => currentNotification() !== null)).toBe(true)
    expect(currentNotification()?.message).toBe('Deleted Markdown Tile')
    expect(host.querySelectorAll('.tile')).toHaveLength(3)

    await act(async () => {
      undoValue(null)
    })
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    expect(restoreTile).toHaveBeenCalledWith(
      { kind: 'homepage' },
      { ...removed, at: { band: 0, h: 100 } },
    )
    expect(saves.at(-1)).toEqual(doc.layout)
  })

  it('a removal the host refuses puts the tile back', async () => {
    stubEditorBridge({
      'tiles:changed': () => () => {},
      'tiles:get': async () => ({ ok: true, value: doc }),
      'tiles:save': async () => ({ ok: true, value: { landed: doc } }),
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: 'hello' } }),
      'tiles:removeTile': async () => ({
        ok: false,
        error: { code: 'operation-failed', message: 'refused' },
      }),
      menu: async () => ({ ok: true, value: 'tile:delete' }),
    })
    useSession.setState((st) => ({
      tree: makeTree(),
      devicePrefs: { ...st.devicePrefs, nativeMenus: true },
      personalization: { ...st.personalization, confirmDeletion: false },
    }))
    clearNotification()
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    await act(async () => {
      ;(host.querySelector('.tile-handle') as HTMLElement).click()
    })
    expect(await until(() => currentNotification()?.message === 'refused')).toBe(true)
    expect(host.querySelectorAll('.tile')).toHaveLength(4)
  })
})
