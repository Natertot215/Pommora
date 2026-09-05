// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { TileHostRef } from '@shared/tiles'
import { insertBand } from './Core/ops'
import { tileIds } from './Core/model'
import { type TileDocSession, useTileDoc } from './useTileDoc'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const HOST: TileHostRef = { kind: 'space', id: 'sp1' }
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
let session: TileDocSession | null = null

function Probe(): null {
  session = useTileDoc(HOST)
  return null
}

const tick = (): Promise<void> => act(async () => {})

beforeEach(async () => {
  disk = docWith('a')
  releaseSave = null
  save.mockClear()
  get.mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = {
    tiles: { get, save },
    onTilesChanged: (fn: (host: TileHostRef) => void) => {
      push = fn
      return () => {}
    },
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<Probe />))
  await tick()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const shown = (): string[] => tileIds(session?.layout ?? { bands: [] })

describe('a host document changing on disk', () => {
  it('replaces the layout for the mounted host and ignores another host', async () => {
    expect(shown()).toEqual(['a'])
    disk = docWith('a', 'b')
    await act(async () => push({ kind: 'space', id: 'other' }))
    await tick()
    expect(shown()).toEqual(['a'])
    await act(async () => push(HOST))
    await tick()
    expect(shown()).toEqual(['a', 'b'])
  })

  it('flushes a pending local save first and reads only after it lands', async () => {
    act(() => session?.setLayout(insertBand(session.layout, 1, 'local', 100)))
    expect(save).not.toHaveBeenCalled()
    disk = docWith('a', 'synced')
    await act(async () => push(HOST))
    expect(save).toHaveBeenCalledOnce()
    await tick()
    expect(get).toHaveBeenCalledOnce()
    expect(shown()).toEqual(['a', 'local'])
    await act(async () => releaseSave?.())
    await tick()
    expect(get).toHaveBeenCalledTimes(2)
    expect(shown()).toEqual(['a', 'synced'])
  })

  it('a later commit builds on the pushed layout, not the pre-push one', async () => {
    disk = docWith('a', 'b')
    await act(async () => push(HOST))
    await tick()
    act(() => session?.commitLayout((cur) => insertBand(cur, 2, 'c', 100)))
    expect(shown()).toEqual(['a', 'b', 'c'])
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
    act(() => session?.setBusy(true))
    await act(async () => releaseGet?.())
    await tick()
    expect(shown()).toEqual(['a'])
    act(() => session?.setBusy(false))
    await tick()
    expect(shown()).toEqual(['a', 'b'])
  })

  it('holds a push while a gesture is busy and applies it once the gesture settles', async () => {
    act(() => session?.setBusy(true))
    disk = docWith('a', 'b')
    await act(async () => push(HOST))
    await tick()
    expect(shown()).toEqual(['a'])
    act(() => session?.commitLayout((cur) => insertBand(cur, 1, 'dropped', 100)))
    act(() => session?.setBusy(false))
    await tick()
    expect(get).toHaveBeenCalledOnce()
    await act(async () => releaseSave?.())
    await tick()
    expect(get).toHaveBeenCalledTimes(2)
    expect(shown()).toEqual(['a', 'b'])
  })
})
