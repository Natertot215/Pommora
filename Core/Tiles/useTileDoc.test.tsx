// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { TileHostRef } from '@pommora/core/Tiles/tiles'
import { insertBand } from './Layout/ops'
import { tileIds, type TileLayout } from './Layout/model'
import { useSession } from '../Session/store'
import { dropAllTileDocs, flushAllTileDocs, readTileBody, writeTileBody } from './tileDocStore'
import { type TileDocSession, useTileDoc, useTileDocReady } from './useTileDoc'
import { stubDialer } from '../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const HOST: TileHostRef = { kind: 'space', id: 'sp1' }
const OTHER: TileHostRef = { kind: 'space', id: 'sp2' }
const docWith = (...ids: string[]): { layout: unknown; tiles: unknown[]; locked: boolean } => ({
  layout: { bands: ids.map((id) => ({ node: { kind: 'tile', id, h: 100 } })) },
  tiles: ids.map((id) => ({ id, type: 'markdown' })),
  locked: false,
})

let disk = docWith('a')
let push: (host: TileHostRef) => void = () => {}
let releaseSave: (() => void) | null = null
const save = vi.fn(
  () =>
    new Promise<{ ok: true; value: null }>((resolve) => {
      releaseSave = () => resolve({ ok: true, value: null })
    }),
)
const get = vi.fn(async () => ({ ok: true as const, value: disk }))

let host: HTMLDivElement
let root: Root
const seats = new Map<string, TileDocSession>()
const ready = new Map<string, boolean>()

function Probe({ seat, on = HOST }: { seat: string; on?: TileHostRef }): null {
  seats.set(seat, useTileDoc(on))
  ready.set(seat, useTileDocReady(on))
  return null
}

function ReadyProbe({
  on,
  report,
}: {
  on: TileHostRef | null
  report: (v: boolean) => void
}): null {
  const value = useTileDocReady(on)
  report(value)
  return null
}

const tick = (): Promise<void> => act(async () => {})
const at = (seat: string): TileDocSession => seats.get(seat) as TileDocSession
const readyAt = (seat: string): boolean => ready.get(seat) === true
const shown = (seat: string): string[] => tileIds(at(seat).layout ?? { bands: [] })
const append = (cur: TileLayout, id: string): TileLayout =>
  insertBand(cur, cur.bands.length, id, 100)

beforeEach(async () => {
  disk = docWith('a')
  releaseSave = null
  seats.clear()
  ready.clear()
  dropAllTileDocs()
  useSession.setState({ hostLocks: {} })
  save.mockClear()
  get.mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'tiles:get': get,
    'tiles:save': save,
    'tiles:changed': (fn: (host: TileHostRef) => void) => {
      push = fn
      return () => {}
    },
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <>
        <Probe seat="a" />
        <Probe seat="b" />
      </>,
    ),
  )
  await tick()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  dropAllTileDocs()
})

describe('one document per host', () => {
  it('loads once for two mounts and renders one tree', () => {
    expect(get).toHaveBeenCalledOnce()
    expect(shown('a')).toEqual(['a'])
    expect(shown('b')).toEqual(['a'])
  })

  it("shows one mount's commit in the other synchronously", () => {
    act(() => at('a').commitLayout((cur) => append(cur, 'fromA')))
    expect(shown('b')).toEqual(['a', 'fromA'])
    act(() => at('b').commitLayout((cur) => append(cur, 'fromB')))
    expect(shown('a')).toEqual(['a', 'fromA', 'fromB'])
  })

  it('debounces one save for a change, not one per mount', async () => {
    act(() => at('a').setLayout(append(at('a').layout, 'b')))
    act(() => at('b').setLayout(append(at('b').layout, 'c')))
    expect(save).not.toHaveBeenCalled()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
    expect(save).toHaveBeenCalledOnce()
    expect(shown('a')).toEqual(['a', 'b', 'c'])
  })

  it('answers a disk push with one read for both mounts', async () => {
    get.mockClear()
    disk = docWith('a', 'b')
    await act(async () => push(HOST))
    await tick()
    expect(get).toHaveBeenCalledOnce()
    expect(shown('a')).toEqual(['a', 'b'])
    expect(shown('b')).toEqual(['a', 'b'])
  })

  it('stays live while one mount leaves, and flushes when the last one does', async () => {
    act(() => at('a').setLayout(append(at('a').layout, 'b')))
    await act(async () => root.render(<Probe seat="a" />))
    expect(save).not.toHaveBeenCalled()
    expect(shown('a')).toEqual(['a', 'b'])
    await act(async () => root.render(null))
    expect(save).toHaveBeenCalledOnce()
    await act(async () => releaseSave?.())
    await tick()
    get.mockClear()
    await act(async () => root.render(<Probe seat="a" />))
    await tick()
    expect(get).toHaveBeenCalledOnce()
  })

  it('a Nexus switch flushes every pending save before dropping', async () => {
    act(() => at('a').setLayout(append(at('a').layout, 'b')))
    const flushed = flushAllTileDocs()
    expect(save).toHaveBeenCalledOnce()
    await act(async () => {
      releaseSave?.()
      await flushed
    })
    act(() => dropAllTileDocs())
    expect(shown('a')).toEqual([])
  })

  it('readiness reads the same document and retires with it', async () => {
    expect(readyAt('a')).toBe(true)
    expect(get).toHaveBeenCalledOnce()
    await act(async () => root.render(null))
    await tick()
    get.mockClear()
    let seen: boolean | null = null
    act(() =>
      root.render(
        <ReadyProbe
          on={HOST}
          report={(v) => {
            seen = v
          }}
        />,
      ),
    )
    expect(seen).toBe(false)
    await tick()
    expect(seen).toBe(true)
    expect(get).toHaveBeenCalledOnce()
  })

  it('a null host is ready and subscribes to nothing', async () => {
    get.mockClear()
    let seen: boolean | null = null
    await act(async () =>
      root.render(
        <ReadyProbe
          on={null}
          report={(v) => {
            seen = v
          }}
        />,
      ),
    )
    expect(seen).toBe(true)
    expect(get).not.toHaveBeenCalled()
  })

  it("drops its tiles' body slots when it retires", async () => {
    writeTileBody('a', 'typed')
    expect(readTileBody('a')).toBe('typed')
    await act(async () => root.render(null))
    await tick()
    expect(readTileBody('a')).toBeNull()
  })

  it('a host swapped in place loads the new document', async () => {
    get.mockClear()
    disk = docWith('x', 'y')
    await act(async () => root.render(<Probe seat="a" on={OTHER} />))
    await tick()
    expect(get).toHaveBeenCalledWith(OTHER)
    expect(shown('a')).toEqual(['x', 'y'])
  })
})

describe('the gesture hold across mounts', () => {
  it("makes a sibling's structural commit wait and apply against the then-live tree", () => {
    act(() => at('a').setBusy(true))
    act(() => at('b').commitLayout((cur) => append(cur, 'appended')))
    expect(shown('a')).toEqual(['a'])
    expect(save).not.toHaveBeenCalled()
    act(() => at('a').setLayout(insertBand(at('a').layout, 1, 'gesture', 100)))
    expect(shown('b')).toEqual(['a', 'gesture'])
    act(() => at('a').setBusy(false))
    expect(shown('a')).toEqual(['a', 'gesture', 'appended'])
    expect(shown('b')).toEqual(['a', 'gesture', 'appended'])
  })

  it('counts the hold, so one mount releasing does not free another', async () => {
    act(() => at('a').setBusy(true))
    act(() => at('b').setBusy(true))
    disk = docWith('a', 'synced')
    await act(async () => push(HOST))
    await tick()
    act(() => at('a').setBusy(false))
    await tick()
    expect(shown('b')).toEqual(['a'])
    act(() => at('b').setBusy(false))
    await act(async () => releaseSave?.())
    await tick()
    expect(shown('b')).toEqual(['a', 'synced'])
  })

  it('ignores a repeated release, which TileGrid sends on every gesture end', () => {
    act(() => at('a').setBusy(true))
    act(() => at('b').commitLayout((cur) => append(cur, 'queued')))
    act(() => at('b').setBusy(false))
    expect(shown('a')).toEqual(['a'])
    act(() => at('a').setBusy(false))
    expect(shown('a')).toEqual(['a', 'queued'])
  })
})

describe('the lock the document owns', () => {
  it('writes once per toggle whatever the mount count', async () => {
    save.mockClear()
    act(() => useSession.getState().setHostLock(HOST, true))
    await tick()
    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith(HOST, { locked: true })
  })
})

describe('a host document changing on disk', () => {
  it('replaces the layout for the mounted host and ignores another host', async () => {
    expect(shown('a')).toEqual(['a'])
    disk = docWith('a', 'b')
    await act(async () => push(OTHER))
    await tick()
    expect(shown('a')).toEqual(['a'])
    await act(async () => push(HOST))
    await tick()
    expect(shown('a')).toEqual(['a', 'b'])
  })

  it('flushes a pending local save first and reads only after it lands', async () => {
    act(() => at('a').setLayout(insertBand(at('a').layout, 1, 'local', 100)))
    expect(save).not.toHaveBeenCalled()
    disk = docWith('a', 'synced')
    await act(async () => push(HOST))
    expect(save).toHaveBeenCalledOnce()
    await tick()
    expect(get).toHaveBeenCalledOnce()
    expect(shown('a')).toEqual(['a', 'local'])
    await act(async () => releaseSave?.())
    await tick()
    expect(get).toHaveBeenCalledTimes(2)
    expect(shown('a')).toEqual(['a', 'synced'])
  })

  it('a later commit builds on the pushed layout, not the pre-push one', async () => {
    disk = docWith('a', 'b')
    await act(async () => push(HOST))
    await tick()
    act(() => at('a').commitLayout((cur) => insertBand(cur, 2, 'c', 100)))
    expect(shown('a')).toEqual(['a', 'b', 'c'])
  })

  it('a gesture that begins during the read holds the push until it settles', async () => {
    let releaseGet: (() => void) | null = null
    get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseGet = () => resolve({ ok: true as const, value: disk })
        }),
    )
    disk = docWith('a', 'b')
    await act(async () => push(HOST))
    act(() => at('a').setBusy(true))
    await act(async () => releaseGet?.())
    await tick()
    expect(shown('a')).toEqual(['a'])
    act(() => at('a').setBusy(false))
    await tick()
    expect(shown('a')).toEqual(['a', 'b'])
  })

  it('holds a push while a gesture is busy and applies it once the gesture settles', async () => {
    act(() => at('a').setBusy(true))
    disk = docWith('a', 'b')
    await act(async () => push(HOST))
    await tick()
    expect(shown('a')).toEqual(['a'])
    act(() => at('a').commitLayout((cur) => insertBand(cur, 1, 'dropped', 100)))
    act(() => at('a').setBusy(false))
    await tick()
    expect(get).toHaveBeenCalledOnce()
    await act(async () => releaseSave?.())
    await tick()
    expect(get).toHaveBeenCalledTimes(2)
    expect(shown('a')).toEqual(['a', 'b'])
  })
})
