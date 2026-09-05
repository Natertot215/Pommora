// Loads once on host open (never the tree walk); persists layout changes with a trailing
// debounce that flushes on unmount so a navigation inside the window can't drop a gesture.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TileHostRef } from '@shared/tiles'
import { tileHostKey } from '@shared/tiles'
import { useSession } from '@renderer/store'
import { decodeLayout, encodeLayout } from './Core/codec'
import { emptyLayout, type TileLayout } from './Core/model'

const SAVE_DEBOUNCE_MS = 300

interface TileDocState {
  layout: TileLayout
  tiles: unknown[]
  ready: boolean
}

export interface TileDocSession extends TileDocState {
  setLayout: (layout: TileLayout) => void
  commitLayout: (update: TileLayout | ((cur: TileLayout) => TileLayout)) => void
  refreshEntries: () => void
  saveTiles: (update: unknown[] | ((cur: unknown[]) => unknown[])) => void
}

export function useTileDoc(host: TileHostRef): TileDocSession {
  const [state, setState] = useState<TileDocState>({
    layout: emptyLayout(),
    tiles: [],
    ready: false,
  })
  const hostRef = useRef(host)
  hostRef.current = host
  const pending = useRef<{
    timer: ReturnType<typeof setTimeout> | null
    layout: TileLayout | null
  }>({
    timer: null,
    layout: null,
  })

  // Async continuations (IPC .then) must never build on a render-captured layout — a gesture
  // committing during the await would be silently overwritten.
  const liveLayout = useRef<TileLayout>(state.layout)

  // Host IDENTITY keys the load — two Spaces share a kind, so kind alone would serve one
  // Space's doc to another after an in-place host swap.
  const hostKey = tileHostKey(host)
  const seedHostLock = useSession((s) => s.seedHostLock)
  useEffect(() => {
    let canceled = false
    void window.nexus.tiles.get(hostRef.current).then((r) => {
      if (canceled || !r.ok) return
      const layout = decodeLayout(r.value.layout) ?? emptyLayout()
      liveLayout.current = layout
      setState({ layout, tiles: r.value.tiles, ready: true })
      seedHostLock(hostRef.current, r.value.locked)
    })
    return () => {
      canceled = true
    }
  }, [hostKey, seedHostLock])

  const flush = useCallback(() => {
    const p = pending.current
    if (p.timer) clearTimeout(p.timer)
    if (p.layout) void window.nexus.tiles.save(hostRef.current, { layout: encodeLayout(p.layout) })
    pending.current = { timer: null, layout: null }
  }, [])

  useEffect(() => flush, [flush])

  const setLayout = useCallback(
    (layout: TileLayout) => {
      liveLayout.current = layout
      setState((s) => ({ ...s, layout }))
      const p = pending.current
      if (p.timer) clearTimeout(p.timer)
      p.layout = layout
      p.timer = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [flush],
  )

  // Structural mutations write the layout NOW, before their entry op runs, so a crash leaves an
  // invisible orphan rather than a dead box. Takes an updater so async callers compose with the
  // live layout, never a stale render capture.
  const commitLayout = useCallback(
    (update: TileLayout | ((cur: TileLayout) => TileLayout)) => {
      const layout = typeof update === 'function' ? update(liveLayout.current) : update
      liveLayout.current = layout
      setState((s) => ({ ...s, layout }))
      pending.current.layout = layout
      flush()
    },
    [flush],
  )

  /** Re-pull the entry list after a main-side entry mutation; the local layout stays. */
  const refreshEntries = useCallback(() => {
    void window.nexus.tiles.get(hostRef.current).then((r) => {
      if (r.ok) setState((s) => ({ ...s, tiles: r.value.tiles }))
    })
  }, [])

  // Same reason as commitLayout — a menu or IPC window between capture and write must not
  // clobber concurrent changes.
  const liveTiles = useRef<unknown[]>(state.tiles)
  liveTiles.current = state.tiles

  /** Write the entry list (per-entry field edits, e.g. style) — immediate. */
  const saveTiles = useCallback((update: unknown[] | ((cur: unknown[]) => unknown[])) => {
    const next = typeof update === 'function' ? update(liveTiles.current) : update
    liveTiles.current = next
    setState((s) => ({ ...s, tiles: next }))
    void window.nexus.tiles.save(hostRef.current, { tiles: next })
  }, [])

  return { ...state, setLayout, commitLayout, refreshEntries, saveTiles }
}
