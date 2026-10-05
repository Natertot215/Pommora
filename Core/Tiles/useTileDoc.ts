import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { type TileHostRef, tileHostKey } from './tiles'
import type { TileLayout } from './Layout/model'
import {
  commitTileLayout,
  EMPTY,
  holdTileDoc,
  readTileDoc,
  setTileLayout,
  subscribeTileDoc,
  type TileDocState,
} from './tileDocStore'

type TileDocSession = TileDocState & {
  setLayout: (layout: TileLayout) => void
  commitLayout: (update: (cur: TileLayout) => TileLayout) => void
  setBusy: (busy: boolean) => void
}

// A null host holds `EMPTY` and subscribes to nothing, so a reader leaves its document when its tab does and the last-listener retirement fires.
export function useDocState(host: TileHostRef | null): TileDocState {
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
  const hostRef = useLatest(host)
  const state = useDocState(host)
  const writes = useMemo(() => {
    const target = hostRef.current
    return {
      setLayout: (layout: TileLayout) => setTileLayout(target, layout),
      commitLayout: (update: (cur: TileLayout) => TileLayout) => commitTileLayout(target, update),
      setBusy: (busy: boolean) => holdTileDoc(target, busy),
    }
  }, [tileHostKey(host)])
  return { ...state, ...writes }
}

/** Each host's document stays loaded while the caller holds it, whether or not a board shows it. */
export function useLoadedTileDocs(hosts: readonly TileHostRef[]): void {
  const latest = useLatest(hosts)
  useEffect(() => {
    const held = latest.current.map((host) => subscribeTileDoc(host, () => {}))
    return () => {
      for (const off of held) off()
    }
  }, [hosts.map(tileHostKey).join(' ')])
}
