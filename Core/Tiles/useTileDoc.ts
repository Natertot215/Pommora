import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { type TileHostRef, tileHostKey } from '@pommora/core/Tiles/tiles'
import type { TileLayout } from './Layout/model'
import {
  commitTileLayout,
  EMPTY,
  holdTileDoc,
  readTileDoc,
  refreshTileEntries,
  saveTileEntries,
  setTileLayout,
  subscribeTileDoc,
  type TileDocState,
} from './tileDocStore'

export interface TileDocSession {
  layout: TileLayout
  tiles: unknown[]
  ready: boolean
  locked: boolean
  setLayout: (layout: TileLayout) => void
  commitLayout: (update: (cur: TileLayout) => TileLayout) => void
  refreshEntries: () => void
  saveTiles: (update: (cur: unknown[]) => unknown[]) => void
  setBusy: (busy: boolean) => void
}

// A null host holds `EMPTY` and subscribes to nothing, so a reader leaves its document when its tab does and the last-listener retirement fires.
function useDocState(host: TileHostRef | null): TileDocState {
  const hostRef = useLatest(host)
  const hostKey = host ? tileHostKey(host) : ''
  const subscribe = useMemo(() => {
    const target = hostRef.current
    return target ? (fn: () => void) => subscribeTileDoc(target, fn) : () => () => {}
  }, [hostKey])
  return useSyncExternalStore(subscribe, () => {
    const target = hostRef.current
    return target ? readTileDoc(target) : EMPTY
  })
}

export function useTileDoc(host: TileHostRef): TileDocSession {
  const hostKey = tileHostKey(host)
  const hostRef = useLatest(host)

  const state = useDocState(host)

  // TileGrid's effect cleanup re-sends `false` on every gesture end, so the hold is tracked per mount and counted once.
  const held = useRef(false)
  const setBusy = useCallback(
    (busy: boolean) => {
      if (busy === held.current) return
      held.current = busy
      holdTileDoc(hostRef.current, busy)
    },
    [hostKey],
  )
  useEffect(() => {
    const target = hostRef.current
    return () => {
      if (!held.current) return
      held.current = false
      holdTileDoc(target, false)
    }
  }, [hostKey])

  const setLayout = useCallback(
    (layout: TileLayout) => setTileLayout(hostRef.current, layout),
    [hostKey],
  )
  const commitLayout = useCallback(
    (update: (cur: TileLayout) => TileLayout) => commitTileLayout(hostRef.current, update),
    [hostKey],
  )
  const refreshEntries = useCallback(() => refreshTileEntries(hostRef.current), [hostKey])
  const saveTiles = useCallback(
    (update: (cur: unknown[]) => unknown[]) => saveTileEntries(hostRef.current, update),
    [hostKey],
  )

  return {
    layout: state.layout,
    tiles: state.tiles,
    ready: state.ready,
    locked: state.lock,
    setLayout,
    commitLayout,
    refreshEntries,
    saveTiles,
    setBusy,
  }
}

export function useTileDocReady(host: TileHostRef | null): boolean {
  const { ready } = useDocState(host)
  return host === null || ready
}

export function useTileDocLock(host: TileHostRef): { locked: boolean; ready: boolean } {
  const { lock, ready } = useDocState(host)
  return { locked: lock, ready }
}
