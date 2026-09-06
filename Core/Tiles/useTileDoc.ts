import { useCallback, useEffect, useRef, useState } from 'react'
import { type TileHostRef, tileHostKey } from '@pommora/core/Tiles/tiles'
import { useSession } from '../Session/store'
import { decodeLayout, encodeLayout } from './Layout/codec'
import { emptyLayout, type TileLayout } from './Layout/model'
import { host as dialer } from '../Platform/dialer'

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
  setBusy: (busy: boolean) => void
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

  // Async continuations must never build on a render-captured layout — a gesture committing during the await would be silently overwritten.
  const liveLayout = useRef<TileLayout>(state.layout)
  // A disk change is read only after the local write it may race has landed, so the user's own last action never silently reverts.
  const lastSave = useRef<Promise<unknown>>(Promise.resolve())

  const liveTiles = useRef<unknown[]>(state.tiles)
  liveTiles.current = state.tiles

  const hostKey = tileHostKey(host)
  const setHostLock = useSession((s) => s.setHostLock)
  const storeLock = useSession((s) => s.hostLocks[hostKey])
  const docLock = useRef<boolean | null>(null)
  const adopt = useCallback(
    (target: TileHostRef, doc: { layout: unknown; tiles: unknown[]; locked: boolean }) => {
      const layout = decodeLayout(doc.layout) ?? emptyLayout()
      liveLayout.current = layout
      liveTiles.current = doc.tiles
      docLock.current = doc.locked
      setHostLock(target, doc.locked)
      setState({ layout, tiles: doc.tiles, ready: true })
    },
    [setHostLock],
  )
  useEffect(() => {
    let canceled = false
    void dialer()
      .ask('tiles:get', hostRef.current)
      .then((r) => {
        if (!canceled && r.ok) adopt(hostRef.current, r.value)
      })
    return () => {
      canceled = true
    }
  }, [hostKey, adopt])
  useEffect(() => {
    if (storeLock === undefined || docLock.current === null || storeLock === docLock.current) return
    docLock.current = storeLock
    lastSave.current = dialer().ask('tiles:save', hostRef.current, { locked: storeLock })
  }, [storeLock])

  const flush = useCallback(() => {
    const p = pending.current
    if (p.timer) clearTimeout(p.timer)
    if (p.layout)
      lastSave.current = dialer().ask('tiles:save', hostRef.current, {
        layout: encodeLayout(p.layout),
      })
    pending.current = { timer: null, layout: null }
  }, [])

  useEffect(() => flush, [flush])

  const busy = useRef(false)
  const heldPush = useRef(false)
  const reload = useCallback(async () => {
    const target = hostRef.current
    const key = tileHostKey(target)
    flush()
    const saved = lastSave.current
    await saved
    const r = await dialer().ask('tiles:get', target)
    // A host swapped in place, or a local edit issued during the read, leaves what came back stale — that edit's own echo pushes again, so dropping this one loses nothing.
    if (
      !r.ok ||
      key !== tileHostKey(hostRef.current) ||
      lastSave.current !== saved ||
      pending.current.layout !== null
    )
      return
    if (busy.current) {
      heldPush.current = true
      return
    }
    adopt(target, r.value)
  }, [flush, adopt])
  useEffect(
    () =>
      dialer().on('tiles:changed', (host) => {
        if (tileHostKey(host) !== tileHostKey(hostRef.current)) return
        if (busy.current) heldPush.current = true
        else void reload()
      }),
    [reload],
  )
  const setBusy = useCallback(
    (next: boolean) => {
      busy.current = next
      if (!next && heldPush.current) {
        heldPush.current = false
        void reload()
      }
    },
    [reload],
  )

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

  // Structural mutations write the layout now, before their entry op, so a crash leaves an invisible orphan rather than a dead box.
  const commitLayout = useCallback(
    (update: TileLayout | ((cur: TileLayout) => TileLayout)) => {
      setLayout(typeof update === 'function' ? update(liveLayout.current) : update)
      flush()
    },
    [setLayout, flush],
  )

  const refreshEntries = useCallback(() => {
    void dialer()
      .ask('tiles:get', hostRef.current)
      .then((r) => {
        if (r.ok) setState((s) => ({ ...s, tiles: r.value.tiles }))
      })
  }, [])

  const saveTiles = useCallback((update: unknown[] | ((cur: unknown[]) => unknown[])) => {
    const next = typeof update === 'function' ? update(liveTiles.current) : update
    liveTiles.current = next
    setState((s) => ({ ...s, tiles: next }))
    lastSave.current = dialer().ask('tiles:save', hostRef.current, { tiles: next })
  }, [])

  return { ...state, setLayout, commitLayout, refreshEntries, saveTiles, setBusy }
}
