// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'
import { undoValue } from '../Session/undo'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { stubEditorBridge } from '../Testing/editorHarness'
import { TileHost } from './TileHost'
import { commitTileLayout, dropAllTileDocs, markTileRemoving } from './tileDocStore'
import { clearCache, knownBody, readBodyBase } from '../Session/pageDetailCache'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { personalizationOf } from '../Session/configSlice'
import { tileId } from '../Testing/tileLayouts'
import { removeLeaf, stretchTileHeight } from './Layout/ops'
import { insertMenuItems, pickTreesOf } from './tileHandleMenu'
import type { TileLayout } from './Layout/model'
import { TILE_MIN_PX } from '@pommora/uix/Utilities/tileMetrics'

const surfaceRenders = vi.hoisted(() => new Map<string, number>())
vi.mock('./Surfaces/MarkdownTile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./Surfaces/MarkdownTile')>()
  return {
    MarkdownTile: (props: Parameters<typeof actual.MarkdownTile>[0]) => {
      surfaceRenders.set(props.tileId, (surfaceRenders.get(props.tileId) ?? 0) + 1)
      return <actual.MarkdownTile {...props} />
    },
  }
})
vi.mock('./Surfaces/PageTile', () => ({
  PageTile: ({ path }: { path: string }) => <div className="page-tile" data-path={path} />,
}))

const observers = new Set<() => void>()
vi.stubGlobal(
  'ResizeObserver',
  class {
    cb: () => void
    constructor(cb: () => void) {
      this.cb = cb
      observers.add(cb)
    }
    observe(): void {}
    disconnect(): void {
      observers.delete(this.cb)
    }
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
const writeMarkdown = vi.fn(async () => ({ ok: true, value: { stale: false, hash: 'h' } }))

beforeEach(() => {
  clearCache()
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
  it('styles a zoomed shell with the one variable and leaves a 1.0 shell bare', async () => {
    const zoomed = {
      ...doc,
      layout: {
        bands: ['a', 'b'].map((id) => ({ node: { kind: 'tile', id: tileId(id), h: 100 } })),
      },
      tiles: [
        { id: tileId('a'), type: 'markdown', zoom: 0.9 },
        { id: tileId('b'), type: 'markdown' },
      ],
    }
    stubEditorBridge({
      'tiles:changed': () => () => {},
      'tiles:get': async () => ({ ok: true, value: zoomed }),
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: '' } }),
    })
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.tile').length === 2)).toBe(true)
    const [a, b] = host.querySelectorAll<HTMLElement>('.tile')
    expect(a?.style.getPropertyValue('--tile-zoom')).toBe('0.9')
    expect(b?.style.getPropertyValue('--tile-zoom')).toBe('')
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

  it("entering edit on one tile leaves another tile's surface undrawn", async () => {
    const two = {
      ...doc,
      layout: {
        bands: ['a', 'b'].map((id) => ({ node: { kind: 'tile', id: tileId(id), h: 100 } })),
      },
      tiles: ['a', 'b'].map((id) => ({ id: tileId(id), type: 'markdown' })),
    }
    stubEditorBridge({
      'tiles:changed': () => () => {},
      'tiles:get': async () => ({ ok: true, value: two }),
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: 'hello' } }),
    })
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.cm-editor').length === 2)).toBe(true)
    const before = surfaceRenders.get(tileId('b'))
    expect(before).toBeGreaterThan(0)
    await act(async () => {
      ;(host.querySelector('.markdown-tile') as HTMLElement).click()
    })
    expect(host.querySelector('.tile.is-editing-tile')).not.toBeNull()
    expect(surfaceRenders.get(tileId('b'))).toBe(before)
  })

  it('a page tile follows its page through a rename', async () => {
    stubEditorBridge({
      'tiles:changed': () => () => {},
      'tiles:get': async () => ({
        ok: true,
        value: { ...doc, tiles: [doc.tiles[0], { ...doc.tiles[1], page_id: 'p1' }] },
      }),
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: 'hello' } }),
    })
    const tree = makeTree()
    useSession.setState({ tree })
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelector('.page-tile') !== null)).toBe(true)
    expect(host.querySelector('.page-tile')?.getAttribute('data-path')).toBe('Notes/Alpha.md')
    const [notes] = tree.collections
    await act(async () => {
      useSession.setState({
        tree: {
          ...tree,
          collections: [
            { ...notes, pages: [{ ...notes.pages[0], title: 'Gamma', path: 'Notes/Gamma.md' }] },
          ],
        },
      })
    })
    expect(host.querySelector('.page-tile')?.getAttribute('data-path')).toBe('Notes/Gamma.md')
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
    expect(knownBody(tileId('m'))).toBe('hello!')
    markTileRemoving(tileId('m'))
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
      tree: makeTree({ personalization: { ...personalizationOf(st), confirmDeletion: false } }),
      devicePrefs: { ...st.devicePrefs, nativeMenus: true },
    }))
    clearNotification()
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelector('.cm-editor') !== null)).toBe(true)
    await act(async () => {
      ;(host.querySelector('.markdown-tile') as HTMLElement).click()
    })
    const view = EditorView.findFromDOM(host.querySelector('.cm-editor') as HTMLElement)
    await act(async () => {
      view?.dispatch({ changes: { from: view.state.doc.length, insert: '!' } })
    })
    await act(async () => {
      ;(host.querySelector('.tile-handle') as HTMLElement).click()
    })
    expect(await until(() => currentNotification() !== null)).toBe(true)
    expect(currentNotification()?.message).toBe('Deleted Markdown Tile')
    expect(host.querySelectorAll('.tile')).toHaveLength(3)
    expect(knownBody(tileId('m'))).toBeUndefined()
    expect(readBodyBase(tileId('m'))).toBeNull()

    await act(async () => {
      undoValue(null)
    })
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    expect(restoreTile).toHaveBeenCalledWith(
      { kind: 'homepage' },
      { ...removed, body: 'hello!', at: { band: 0, h: 100 } },
    )
    expect(saves.at(-1)).toEqual(doc.layout)
    expect(writeMarkdown).not.toHaveBeenCalled()
  })

  const deleteBox = async (at: number, bridge: Record<string, unknown>, layout = doc.layout) => {
    stubEditorBridge({
      'tiles:changed': () => () => {},
      'tiles:get': async () => ({ ok: true, value: { ...doc, layout } }),
      'tiles:save': async () => ({ ok: true, value: { landed: doc } }),
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: 'hello' } }),
      menu: async () => ({ ok: true, value: 'tile:delete' }),
      ...bridge,
    })
    useSession.setState((st) => ({
      tree: makeTree({ personalization: { ...personalizationOf(st), confirmDeletion: false } }),
      devicePrefs: { ...st.devicePrefs, nativeMenus: true },
    }))
    clearNotification()
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    await act(async () => {
      ;(host.querySelectorAll('.tile-handle')[at] as HTMLElement).click()
    })
    expect(await until(() => currentNotification() !== null)).toBe(true)
    expect(currentNotification()?.message).toBe('Deleted Tile')
    expect(host.querySelectorAll('.tile')).toHaveLength(3)
  }

  it('a box of a kind this build doesn’t know can be deleted, and its Undo brings the entry back', async () => {
    const removed = { entry: doc.tiles[3] }
    const restoreTile = vi.fn(async () => ({ ok: true, value: { landed: doc } }))
    await deleteBox(3, {
      'tiles:removeTile': async () => ({
        ok: true,
        value: { removed, landed: { ...doc, tiles: doc.tiles.slice(0, 3) } },
      }),
      'tiles:restoreTile': restoreTile,
    })
    await act(async () => {
      undoValue(null)
    })
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    expect(restoreTile).toHaveBeenCalledWith(
      { kind: 'homepage' },
      { ...removed, at: { band: 3, h: 100 } },
    )
  })

  it('a box whose id names no tile leaves the board without asking the host, and for good', async () => {
    const removeTile = vi.fn()
    const layout = {
      bands: [...doc.layout.bands.slice(0, 3), { node: { kind: 'tile', id: 'x/y', h: 100 } }],
    }
    await deleteBox(3, { 'tiles:removeTile': removeTile }, layout)
    expect(removeTile).not.toHaveBeenCalled()
    expect(currentNotification()?.action).toBeUndefined()
  })

  it('a removal the host refuses puts the tile back', async () => {
    stubEditorBridge({
      'tiles:changed': () => () => {},
      'tiles:get': async () => ({ ok: true, value: doc }),
      'tiles:save': async () => ({ ok: true, value: { landed: doc } }),
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: 'hello' } }),
      'tiles:writeMarkdown': writeMarkdown,
      'tiles:removeTile': async () => ({
        ok: false,
        error: { code: 'operation-failed', message: 'refused' },
      }),
      menu: async () => ({ ok: true, value: 'tile:delete' }),
    })
    useSession.setState((st) => ({
      tree: makeTree({ personalization: { ...personalizationOf(st), confirmDeletion: false } }),
      devicePrefs: { ...st.devicePrefs, nativeMenus: true },
    }))
    clearNotification()
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    await act(async () => {
      ;(host.querySelector('.tile-handle') as HTMLElement).click()
    })
    expect(await until(() => currentNotification()?.message === 'refused')).toBe(true)
    expect(host.querySelectorAll('.tile')).toHaveLength(4)
    await act(async () => {
      ;(host.querySelector('.markdown-tile') as HTMLElement).click()
    })
    const view = EditorView.findFromDOM(host.querySelector('.cm-editor') as HTMLElement)
    await act(async () => {
      view?.dispatch({ changes: { from: view.state.doc.length, insert: '!' } })
    })
    expect(await until(() => writeMarkdown.mock.calls.length > 0)).toBe(true)
  })

  it('a duplicate whose source left the board before its reply lands as the last band', async () => {
    const copy = tileId('c')
    let reply: (r: unknown) => void = () => {}
    const saves: { bands: { node: { kind: string; id: string; h: number } }[] }[] = []
    stubEditorBridge({
      'tiles:changed': () => () => {},
      'tiles:get': async () => ({ ok: true, value: doc }),
      'tiles:save': async (_host: unknown, patch: { layout?: unknown }) => {
        if (patch.layout) saves.push(patch.layout as (typeof saves)[number])
        return { ok: true, value: { landed: doc } }
      },
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: 'hello' } }),
      'tiles:duplicateTile': () =>
        new Promise((r) => {
          reply = r
        }),
      menu: async () => ({ ok: true, value: 'tile:duplicate' }),
    })
    useSession.setState((st) => ({
      tree: makeTree(),
      devicePrefs: { ...st.devicePrefs, nativeMenus: true },
    }))
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(() => host.querySelectorAll('.tile').length === 4)).toBe(true)
    await act(async () => {
      ;(host.querySelector('.tile-handle') as HTMLElement).click()
    })
    // A sibling mount removes the source while the copy is in flight.
    await act(async () =>
      commitTileLayout({ kind: 'homepage' }, (cur) => removeLeaf(cur, tileId('m'))),
    )
    await act(async () => {
      reply({
        ok: true,
        value: {
          id: copy,
          landed: { ...doc, tiles: [...doc.tiles, { id: copy, type: 'markdown' }] },
        },
      })
    })
    expect(await until(() => saves.at(-1)?.bands.some((b) => b.node.id === copy) ?? false)).toBe(
      true,
    )
    const final = saves.at(-1)
    expect(final?.bands.map((b) => b.node.id)).toEqual([
      tileId('p'),
      tileId('v'),
      tileId('w'),
      copy,
    ])
    expect(final?.bands.at(-1)?.node.h).toBe(250)
  })
})

describe('the Insert Menu a ghost tile opens', () => {
  const made = tileId('n')
  type Saved = { bands: { node: { kind: string; id: string; h: number } }[] }
  const empty = { layout: { bands: [] }, tiles: [], locked: false }
  // A row whose second tile ends above the first: a wedge under `b`.
  const wedged = {
    layout: {
      bands: [
        {
          node: {
            kind: 'row',
            ratios: [0.5, 0.5],
            children: [
              { kind: 'tile', id: tileId('a'), h: 200 },
              { kind: 'tile', id: tileId('b'), h: 100 },
            ],
          },
        },
      ],
    },
    tiles: [
      { id: tileId('a'), type: 'markdown' },
      { id: tileId('b'), type: 'markdown' },
    ],
    locked: false,
  }
  const bridge = (
    action: string | null,
    over: Record<string, unknown> = {},
    get: () => unknown = () => empty,
  ) => {
    const saves: Saved[] = []
    const menus: { anchor?: unknown }[] = []
    const creates: unknown[][] = []
    let changed: ((c: unknown) => void) | null = null
    stubEditorBridge({
      'tiles:changed': (fn: (c: unknown) => void) => {
        changed = fn
        return () => {}
      },
      'tiles:get': async () => ({ ok: true, value: get() }),
      'tiles:save': async (_host: unknown, patch: { layout?: unknown }) => {
        if (patch.layout) saves.push(patch.layout as Saved)
        return { ok: true, value: { landed: get() } }
      },
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: '' } }),
      'tiles:create': async (...args: unknown[]) => {
        creates.push(args)
        const cur = get() as typeof empty
        return {
          ok: true,
          value: {
            id: made,
            landed: { ...cur, tiles: [...cur.tiles, { id: made, type: 'markdown' }] },
          },
        }
      },
      menu: async (req: { anchor?: unknown }) => {
        menus.push(req)
        return { ok: true, value: action }
      },
      ...over,
    })
    useSession.setState((st) => ({
      tree: makeTree(),
      devicePrefs: { ...st.devicePrefs, nativeMenus: true },
    }))
    return {
      saves,
      menus,
      creates,
      reload: () => changed?.({ host: { kind: 'homepage' }, ids: [] }),
    }
  }
  const click = async (sel: string, detail = 1): Promise<void> => {
    const el = host.querySelector(sel) as HTMLElement
    await act(async () => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail, clientX: 40, clientY: 60 }))
    })
  }
  const mountHost = async (ready: () => boolean): Promise<void> => {
    await act(async () => root.render(<TileHost host={{ kind: 'homepage' }} />))
    expect(await until(ready)).toBe(true)
  }
  const bandIds = (saved: Saved | undefined): string[] | undefined =>
    saved?.bands.map((b) => b.node.id)

  it('New Page over an empty board creates a blank tile as its first band and hands it the caret', async () => {
    const { saves, creates } = bridge('tile:new')
    await mountHost(() => host.querySelector('.tile-ghost') !== null)
    await click('.tile-ghost')
    expect(await until(() => saves.length > 0)).toBe(true)
    expect(creates[0]).toEqual([{ kind: 'homepage' }, undefined])
    expect(bandIds(saves.at(-1))).toEqual([made])
    expect(saves.at(-1)?.bands[0].node.h).toBe(250)
    expect(await until(() => host.querySelector('.tile.is-editing-tile') !== null)).toBe(true)
    expect(host.querySelector('.tile-ghost')).toBeNull()
  })

  it('a link row creates the tile already linked, without the caret', async () => {
    const linked: unknown[][] = []
    bridge('tile:pick:0', {
      'tiles:create': async (...args: unknown[]) => {
        linked.push(args)
        return {
          ok: true,
          value: {
            id: made,
            landed: { ...empty, tiles: [{ id: made, type: 'page', page_id: 'p1' }] },
          },
        }
      },
    })
    await mountHost(() => host.querySelector('.tile-ghost') !== null)
    await click('.tile-ghost')
    expect(await until(() => host.querySelectorAll('.tile').length === 1)).toBe(true)
    const { picks } = insertMenuItems(pickTreesOf(makeTree(), undefined), 'file')
    expect(linked[0]).toEqual([{ kind: 'homepage' }, picks[0]])
    expect(host.querySelector('.tile.is-editing-tile')).toBeNull()
  })

  it('the add strip appends a full-width band, its menu hanging from the click or, from the keyboard, the strip', async () => {
    const { saves, menus } = bridge('tile:new', {}, () => wedged)
    await mountHost(() => host.querySelector('.tile-add button') !== null)
    const strip = host.querySelector('.tile-add button') as HTMLElement
    strip.getBoundingClientRect = () => ({ left: 10, top: 300, width: 400, height: 14 }) as DOMRect
    await click('.tile-add button')
    expect(await until(() => saves.length > 0)).toBe(true)
    expect(saves.at(-1)?.bands).toHaveLength(2)
    expect(saves.at(-1)?.bands.at(-1)?.node).toEqual({ kind: 'tile', id: made, h: 250 })
    expect(menus[0].anchor).toEqual({ left: 40, top: 60, height: 0 })
    expect(await until(() => host.querySelector('.tile.is-editing-tile') !== null)).toBe(true)
    await click('.tile-add button', 0)
    expect(await until(() => menus.length === 2)).toBe(true)
    expect(menus[1].anchor).toEqual({ left: 10, top: 300, height: 14 })
  })

  it('a bottom ghost seats its band at the height the room below the board gave it', async () => {
    const { saves } = bridge('tile:new', {}, () => wedged)
    await mountHost(() => host.querySelector('.tile-add') !== null)
    host.style.overflowY = 'auto'
    host.getBoundingClientRect = () => ({ top: 0, bottom: 600 }) as DOMRect
    await act(async () => {
      for (const resized of observers) resized()
    })
    await act(async () => {
      host
        .querySelector('.tile-add')
        ?.dispatchEvent(
          new PointerEvent('pointerover', { bubbles: true, relatedTarget: document.body }),
        )
      window.dispatchEvent(new PointerEvent('pointermove'))
    })
    expect(await until(() => host.querySelector('.tile-ghost') !== null)).toBe(true)
    expect(host.querySelector<HTMLElement>('.tile-ghost')?.style.height).toBe('392px')
    await click('.tile-ghost')
    expect(await until(() => saves.length > 0)).toBe(true)
    expect(saves.at(-1)?.bands.at(-1)?.node).toEqual({ kind: 'tile', id: made, h: 392 })
  })

  it('a dismissed menu creates nothing and leaves the standing ghost unheld', async () => {
    const { creates, menus } = bridge(null)
    await mountHost(() => host.querySelector('.tile-ghost') !== null)
    await click('.tile-ghost')
    expect(await until(() => menus.length === 1)).toBe(true)
    await act(async () => {})
    expect(creates).toHaveLength(0)
    const ghost = host.querySelector('.tile-ghost')
    expect(ghost).not.toBeNull()
    expect(ghost?.hasAttribute('data-reveal-held')).toBe(false)
  })

  // A sibling mount changes the board while the create is in flight; the reply then seats against the board as it stands.
  const wedgeFlight = async (meanwhile: (cur: TileLayout) => TileLayout): Promise<Saved[]> => {
    let reply: (r: unknown) => void = () => {}
    const { saves } = bridge(
      'tile:new',
      {
        'tiles:create': () =>
          new Promise((r) => {
            reply = r
          }),
      },
      () => wedged,
    )
    await mountHost(() => host.querySelectorAll('.tile').length === 2)
    const zone = host.querySelector('.tile-zone') as HTMLElement
    await act(async () => {
      zone.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, relatedTarget: document.body }),
      )
      window.dispatchEvent(new PointerEvent('pointermove'))
    })
    expect(await until(() => host.querySelector('.tile-ghost') !== null)).toBe(true)
    await click('.tile-ghost')
    await act(async () => commitTileLayout({ kind: 'homepage' }, meanwhile))
    await act(async () => {
      reply({
        ok: true,
        value: {
          id: made,
          landed: { ...wedged, tiles: [...wedged.tiles, { id: made, type: 'markdown' }] },
        },
      })
    })
    expect(await until(() => saves.some((x) => JSON.stringify(x).includes(made)))).toBe(true)
    return saves
  }

  it('a wedge whose tile left before the reply gives way to the last band', async () => {
    const saves = await wedgeFlight((cur) => removeLeaf(cur, tileId('b')))
    expect(saves.at(-1)?.bands).toHaveLength(2)
    expect(saves.at(-1)?.bands.at(-1)?.node).toEqual({ kind: 'tile', id: made, h: 250 })
  })

  it('a wedge whose fill changed before the reply seats the tile at the fill the board now gives', async () => {
    const saves = await wedgeFlight((cur) => stretchTileHeight(cur, tileId('a'), 100, TILE_MIN_PX))
    const row = saves.at(-1)?.bands[0].node as unknown as {
      children: { kind: string; children: { id: string; h: number }[] }[]
    }
    expect(row.children[1].kind).toBe('column')
    expect(row.children[1].children.map((c) => c.id)).toEqual([tileId('b'), made])
    expect(row.children[1].children[1].h).toBe(192)
  })

  it('a board locked while the menu is open takes no pick', async () => {
    let cur: unknown = empty
    const { creates, reload } = bridge(
      'tile:new',
      {
        menu: async () => {
          cur = { ...empty, locked: true }
          reload()
          await new Promise((r) => setTimeout(r, 20))
          return { ok: true, value: 'tile:new' }
        },
      },
      () => cur,
    )
    await mountHost(() => host.querySelector('.tile-ghost') !== null)
    await click('.tile-ghost')
    expect(await until(() => host.querySelector('.tile-ghost') === null)).toBe(true)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40))
    })
    expect(creates).toHaveLength(0)
  })

  it('the handle menu takes no mutating pick on a board locked since it opened, and still opens the page', async () => {
    let cur: unknown = { ...doc, tiles: [doc.tiles[0], { ...doc.tiles[1], page_id: 'p1' }] }
    let action = 'tile:duplicate'
    const duplicate = vi.fn()
    const select = vi.fn()
    const { reload } = bridge(
      null,
      {
        'tiles:duplicateTile': duplicate,
        menu: async () => {
          cur = { ...(cur as object), locked: true }
          reload()
          await new Promise((r) => setTimeout(r, 20))
          return { ok: true, value: action }
        },
      },
      () => cur,
    )
    useSession.setState({ select })
    await mountHost(() => host.querySelectorAll('.tile').length === 4)
    await click('.tile-handle')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60))
    })
    expect(duplicate).not.toHaveBeenCalled()
    action = 'tile:open'
    await act(async () => {
      ;(host.querySelectorAll('.tile-handle')[1] as HTMLElement).click()
    })
    expect(await until(() => select.mock.calls.length === 1)).toBe(true)
    expect(select.mock.calls[0][0]).toMatchObject({ kind: 'page', id: 'p1' })
  })
})
