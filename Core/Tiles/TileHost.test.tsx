// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'
import { undoValue } from '../Session/undo'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { stubEditorBridge } from '../Testing/editorHarness'
import { TileHost } from './TileHost'
import { dropAllTileDocs, holdTileDoc, markTileRemoving, setTileLayout } from './tileDocStore'
import type { TileLayout } from './Layout/model'
import { clearCache, knownBody, readBodyBase } from '../Session/pageDetailCache'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { personalizationOf } from '../Session/configSlice'
import { tileId } from '../Testing/tileLayouts'
import { insertMenuItems, pickTreesOf } from './tileHandleMenu'

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
})

describe('the Insert Menu a ghost tile opens', () => {
  const made = tileId('n')
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
  // The landed document a create answers with: its entry and its leaf, as the last band.
  const seated = (doc: unknown, entry: unknown) => {
    const cur = doc as typeof empty
    return {
      ...cur,
      tiles: [...cur.tiles, entry],
      layout: { bands: [...cur.layout.bands, { node: { kind: 'tile', id: made, h: 250 } }] },
    }
  }
  const bridge = (
    action: string | null,
    over: Record<string, unknown> = {},
    get: () => unknown = () => empty,
  ) => {
    const saves: unknown[] = []
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
        if (patch.layout) saves.push(patch.layout)
        return { ok: true, value: { landed: get() } }
      },
      'tiles:readMarkdown': async () => ({ ok: true, value: { body: '' } }),
      'tiles:create': async (...args: unknown[]) => {
        creates.push(args)
        return {
          ok: true,
          value: { id: made, landed: seated(get(), { id: made, type: 'markdown' }) },
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
  it('New Page over an empty board creates a blank tile as its first band and hands it the caret', async () => {
    const { saves, creates } = bridge('tile:new')
    await mountHost(() => host.querySelector('.tile-ghost') !== null)
    await click('.tile-ghost')
    expect(await until(() => host.querySelector('.tile.is-editing-tile') !== null)).toBe(true)
    expect(creates[0]).toEqual([{ kind: 'homepage' }, { kind: 'append' }, undefined])
    expect(host.querySelector('.tile-ghost')).toBeNull()
    // The board adopts the layout the write landed, and writes none of its own.
    expect(saves).toEqual([])
  })

  it('a link row creates the tile already linked, without the caret', async () => {
    const linked: unknown[][] = []
    bridge('tile:pick:0', {
      'tiles:create': async (...args: unknown[]) => {
        linked.push(args)
        return {
          ok: true,
          value: { id: made, landed: seated(empty, { id: made, type: 'page', page_id: 'p1' }) },
        }
      },
    })
    await mountHost(() => host.querySelector('.tile-ghost') !== null)
    await click('.tile-ghost')
    expect(await until(() => host.querySelectorAll('.tile').length === 1)).toBe(true)
    const { picks } = insertMenuItems(pickTreesOf(makeTree(), undefined), 'file')
    expect(linked[0]).toEqual([{ kind: 'homepage' }, { kind: 'append' }, picks[0]])
    expect(host.querySelector('.tile.is-editing-tile')).toBeNull()
  })

  it('the add strip appends a full-width band, its menu hanging from the click or, from the keyboard, the strip', async () => {
    const { creates, menus } = bridge('tile:new', {}, () => wedged)
    await mountHost(() => host.querySelector('.tile-add button') !== null)
    const strip = host.querySelector('.tile-add button') as HTMLElement
    strip.getBoundingClientRect = () => ({ left: 10, top: 300, width: 400, height: 14 }) as DOMRect
    await click('.tile-add button')
    expect(await until(() => creates.length > 0)).toBe(true)
    expect(creates[0][1]).toEqual({ kind: 'append' })
    expect(menus[0].anchor).toEqual({ left: 40, top: 60, height: 0 })
    expect(await until(() => host.querySelector('.tile.is-editing-tile') !== null)).toBe(true)
    await click('.tile-add button', 0)
    expect(await until(() => menus.length === 2)).toBe(true)
    expect(menus[1].anchor).toEqual({ left: 10, top: 300, height: 14 })
  })

  it('a bottom ghost seats its band at the height the room below the board gave it', async () => {
    const { creates } = bridge('tile:new', {}, () => wedged)
    host.style.overflowY = 'auto'
    await mountHost(() => host.querySelector('.tile-add') !== null)
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
    expect(await until(() => creates.length > 0)).toBe(true)
    expect(creates[0][1]).toEqual({ kind: 'append', h: 392 })
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

  // A wedge create whose reply the test hands back, the board's layout writes and its order of calls kept.
  const wedgeFlight = async () => {
    let reply: (r: unknown) => void = () => {}
    const sent: unknown[][] = []
    const order: string[] = []
    const { saves } = bridge(
      'tile:new',
      {
        'tiles:save': async (_host: unknown, patch: { layout?: unknown }) => {
          if (patch.layout) {
            saves.push(patch.layout)
            order.push('save')
          }
          return { ok: true, value: { landed: wedged } }
        },
        'tiles:create': (...args: unknown[]) => {
          sent.push(args)
          order.push('create')
          return new Promise((r) => {
            reply = r
          })
        },
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
    const land = (): Promise<void> =>
      act(async () =>
        reply({
          ok: true,
          value: { id: made, landed: seated(wedged, { id: made, type: 'markdown' }) },
        }),
      )
    return { sent, order, saves, land }
  }
  // The board as a gesture leaves it: `a` taller, and no leaf for the tile in flight.
  const stretched = {
    bands: [
      {
        node: {
          kind: 'row',
          ratios: [0.5, 0.5],
          children: [
            { kind: 'tile', id: tileId('a'), h: 300 },
            { kind: 'tile', id: tileId('b'), h: 100 },
          ],
        },
      },
    ],
  } as TileLayout
  const holds = (saved: unknown): boolean =>
    JSON.stringify(saved).includes(made) && JSON.stringify(saved).includes('"h":300')

  it('a wedge sends its tile, and a layout still owed lands before the create', async () => {
    const { sent, order } = await wedgeFlight()
    setTileLayout({ kind: 'homepage' }, stretched)
    await click('.tile-ghost')
    expect(await until(() => sent.length === 1)).toBe(true)
    expect(sent[0][1]).toEqual({ kind: 'wedge', above: tileId('b') })
    expect(order).toEqual(['save', 'create'])
  })

  it('a layout committed while the seat is in flight keeps both the change and the tile', async () => {
    const { saves, land } = await wedgeFlight()
    await click('.tile-ghost')
    await act(async () => setTileLayout({ kind: 'homepage' }, stretched))
    await land()
    expect(await until(() => host.querySelectorAll('.tile').length === 3)).toBe(true)
    expect(await until(() => holds(saves.at(-1)))).toBe(true)
  })

  it('a seat landing under a held gesture joins the tree the gesture commits at its release', async () => {
    const { saves, land } = await wedgeFlight()
    await click('.tile-ghost')
    holdTileDoc({ kind: 'homepage' }, true)
    await land()
    await act(async () => setTileLayout({ kind: 'homepage' }, stretched))
    expect(host.querySelectorAll('.tile')).toHaveLength(2)
    await act(async () => holdTileDoc({ kind: 'homepage' }, false))
    expect(await until(() => host.querySelectorAll('.tile').length === 3)).toBe(true)
    expect(await until(() => holds(saves.at(-1)))).toBe(true)
  })

  it('a duplicate shows its copy from the layout its write landed, writing none of its own', async () => {
    const copy = tileId('c')
    const { saves } = bridge(
      null,
      {
        'tiles:duplicateTile': async () => ({
          ok: true,
          value: {
            id: copy,
            landed: {
              ...wedged,
              tiles: [...wedged.tiles, { id: copy, type: 'markdown' }],
              layout: {
                bands: [...wedged.layout.bands, { node: { kind: 'tile', id: copy, h: 250 } }],
              },
            },
          },
        }),
        menu: async () => ({ ok: true, value: 'tile:duplicate' }),
      },
      () => wedged,
    )
    await mountHost(() => host.querySelectorAll('.tile').length === 2)
    await act(async () => {
      ;(host.querySelector('.tile-handle') as HTMLElement).click()
    })
    expect(await until(() => host.querySelectorAll('.tile').length === 3)).toBe(true)
    expect(saves).toEqual([])
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
